import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { join } from "path";

export class ScheduledNotificationConstruct extends Construct {
  public readonly scheduledTopic: sns.Topic;
  public readonly primaryQueue: sqs.Queue;
  public readonly secondaryQueue: sqs.Queue;
  public readonly schedulerLambda: lambda.NodejsFunction;
  private scanJobLambda?: lambda.NodejsFunction;
  private jobTable?: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 1. Create SNS Topic for scheduled notifications
    this.scheduledTopic = new sns.Topic(this, "ScheduledNotificationTopic", {
      displayName: "Scheduled Notification Topic",
      topicName: "scheduled-notifications",
    });

    // 2. Create Dead Letter Queues
    const primaryDlq = new sqs.Queue(this, "PrimaryDLQ", {
      queueName: "scheduled-primary-dlq",
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    const secondaryDlq = new sqs.Queue(this, "SecondaryDLQ", {
      queueName: "scheduled-secondary-dlq",
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    // 3. Create Primary Queue (for urgent/immediate processing)
    this.primaryQueue = new sqs.Queue(this, "PrimaryQueue", {
      queueName: "scheduled-primary-queue",
      visibilityTimeout: Duration.seconds(300),
      retentionPeriod: Duration.days(4),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        queue: primaryDlq,
        maxReceiveCount: 3,
      },
    });

    // 4. Create Secondary Queue (for batch/background processing)
    this.secondaryQueue = new sqs.Queue(this, "SecondaryQueue", {
      queueName: "scheduled-secondary-queue",
      visibilityTimeout: Duration.seconds(600),
      retentionPeriod: Duration.days(7),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        queue: secondaryDlq,
        maxReceiveCount: 5,
      },
    });

    // 5. Subscribe both queues to the SNS topic
    this.scheduledTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.primaryQueue, {
        filterPolicy: {
          messageType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["urgent", "immediate", "all"],
          }),
        },
        rawMessageDelivery: false,
      })
    );

    this.scheduledTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.secondaryQueue, {
        filterPolicy: {
          messageType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["batch", "background", "all"],
          }),
        },
        rawMessageDelivery: false,
      })
    );

    // 6. Create Lambda function to publish scheduled messages
    this.schedulerLambda = new lambda.NodejsFunction(this, "SchedulerLambda", {
      entry: join(__dirname, "../src/schedulers/hourly-scheduler.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      environment: {
        SNS_TOPIC_ARN: this.scheduledTopic.topicArn,
      },
    });

    // Grant permission to publish to SNS topic
    this.scheduledTopic.grantPublish(this.schedulerLambda);

    // 7. Create EventBridge rule to trigger every hour
    const hourlyRule = new events.Rule(this, "HourlyScheduleRule", {
      description: "Trigger scheduled notifications every hour",
      schedule: events.Schedule.rate(Duration.hours(1)),
      enabled: true,
    });

    // Add Lambda as target for the EventBridge rule
    hourlyRule.addTarget(new targets.LambdaFunction(this.schedulerLambda));

    // 8. Create processor Lambda functions for both queues
    this.createProcessorLambdas();

    // 9. Create DynamoDB scan job (every 10 minutes)
    this.createDynamoScanJob();
  }

  private createProcessorLambdas() {
    // Primary queue processor (for urgent messages)
    const primaryProcessor = new lambda.NodejsFunction(
      this,
      "PrimaryProcessor",
      {
        entry: join(__dirname, "../src/processors/primary-processor.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.minutes(5),
        reservedConcurrentExecutions: 20,
        environment: {
          QUEUE_NAME: "primary",
          QUEUE_URL: this.primaryQueue.queueUrl,
        },
      }
    );

    // Secondary queue processor (for batch/background messages)
    const secondaryProcessor = new lambda.NodejsFunction(
      this,
      "SecondaryProcessor",
      {
        entry: join(__dirname, "../src/processors/secondary-processor.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.minutes(10),
        reservedConcurrentExecutions: 5,
        environment: {
          QUEUE_NAME: "secondary",
          QUEUE_URL: this.secondaryQueue.queueUrl,
        },
      }
    );

    // Grant permissions to consume messages
    this.primaryQueue.grantConsumeMessages(primaryProcessor);
    this.secondaryQueue.grantConsumeMessages(secondaryProcessor);

    // Add SQS event sources
    primaryProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(this.primaryQueue, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(5),
        reportBatchItemFailures: true,
      })
    );

    secondaryProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(this.secondaryQueue, {
        batchSize: 25,
        maxBatchingWindow: Duration.seconds(20),
        reportBatchItemFailures: true,
      })
    );
  }

  // Method to create additional scheduled rules
  public addCustomScheduleRule(
    ruleId: string,
    scheduleExpression: events.Schedule,
    description?: string
  ): events.Rule {
    const customRule = new events.Rule(this, ruleId, {
      description:
        description || `Custom scheduled notification rule: ${ruleId}`,
      schedule: scheduleExpression,
      enabled: true,
    });

    customRule.addTarget(new targets.LambdaFunction(this.schedulerLambda));
    return customRule;
  }

  private createDynamoScanJob() {
    // DynamoDB table to hold items that need periodic external enrichment
    const jobTable = new dynamodb.Table(this, "ScheduledJobItemsTable", {
      tableName: "scheduled-job-items",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        process.env.CDK_DEFAULT_REGION === "local" ? undefined : undefined, // keep default (RETAIN) unless explicitly changed
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Lambda that scans the table and calls an external API (mocked) then updates items
    const scanJobLambda = new lambda.NodejsFunction(
      this,
      "DynamoScanJobLambda",
      {
        entry: join(__dirname, "../src/schedulers/dynamo-scan-scheduler.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.minutes(5),
        memorySize: 512,
        environment: {
          TABLE_NAME: jobTable.tableName,
          EXTERNAL_API_URL: "https://example.com/mock-endpoint", // can be overridden
          SCAN_LIMIT: "50", // max items per invocation
          SCHEDULED_TOPIC_ARN: this.scheduledTopic.topicArn,
        },
      }
    );

    jobTable.grantReadWriteData(scanJobLambda);
    this.scheduledTopic.grantPublish(scanJobLambda);

    // EventBridge rule every 10 minutes
    const tenMinuteRule = new events.Rule(this, "TenMinuteDynamoScanRule", {
      description: "Scan DynamoDB table and process items every 10 minutes",
      schedule: events.Schedule.rate(Duration.minutes(10)),
      enabled: true,
    });
    tenMinuteRule.addTarget(new targets.LambdaFunction(scanJobLambda));

    this.jobTable = jobTable;
    this.scanJobLambda = scanJobLambda;
  }
}
