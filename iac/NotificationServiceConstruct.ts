import { Construct } from "constructs";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { join } from "path";

export class NotificationServiceConstruct extends Construct {
  public readonly topic: sns.Topic;
  public readonly queues: { [key: string]: sqs.Queue };

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 1. Create SNS Topic with encryption
    this.topic = new sns.Topic(this, "NotificationTopic", {
      displayName: "Main Notification Topic",
      topicName: "main-notifications",
      // Enable server-side encryption with AWS managed key
    });

    // 2. Create Dead Letter Queues for each service
    const emailDlq = new sqs.Queue(this, "EmailDLQ", {
      queueName: "email-service-dlq",
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    const smsDlq = new sqs.Queue(this, "SmsDLQ", {
      queueName: "sms-service-dlq",
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    const pushDlq = new sqs.Queue(this, "PushDLQ", {
      queueName: "push-notification-dlq",
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    const auditDlq = new sqs.Queue(this, "AuditDLQ", {
      queueName: "audit-service-dlq",
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
    });

    // 3. Create main queues with DLQ configuration
    const emailQueue = new sqs.Queue(this, "EmailQueue", {
      queueName: "email-service-queue",
      visibilityTimeout: Duration.seconds(300),
      retentionPeriod: Duration.days(4),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        queue: emailDlq,
        maxReceiveCount: 3,
      },
    });

    const smsQueue = new sqs.Queue(this, "SmsQueue", {
      queueName: "sms-service-queue",
      visibilityTimeout: Duration.seconds(180),
      retentionPeriod: Duration.days(4),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        queue: smsDlq,
        maxReceiveCount: 3,
      },
    });

    const pushQueue = new sqs.Queue(this, "PushQueue", {
      queueName: "push-notification-queue",
      visibilityTimeout: Duration.seconds(120),
      retentionPeriod: Duration.days(2),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        queue: pushDlq,
        maxReceiveCount: 5,
      },
    });

    const auditQueue = new sqs.Queue(this, "AuditQueue", {
      queueName: "audit-service-queue",
      visibilityTimeout: Duration.seconds(600),
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        queue: auditDlq,
        maxReceiveCount: 1,
      },
    });

    // 4. Create SNS subscriptions with message filtering
    this.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(emailQueue, {
        filterPolicy: {
          notificationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["email", "all"],
          }),
        },
        rawMessageDelivery: false,
      })
    );

    this.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(smsQueue, {
        filterPolicy: {
          notificationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["sms", "all"],
          }),
          priority: sns.SubscriptionFilter.stringFilter({
            allowlist: ["high", "critical"],
          }),
        },
        rawMessageDelivery: false,
      })
    );

    this.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(pushQueue, {
        filterPolicy: {
          notificationType: sns.SubscriptionFilter.stringFilter({
            allowlist: ["push", "all"],
          }),
        },
        rawMessageDelivery: false,
      })
    );

    // Audit queue receives all messages
    this.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(auditQueue, {
        rawMessageDelivery: true,
      })
    );

    // 5. Store queues for external access
    this.queues = {
      email: emailQueue,
      sms: smsQueue,
      push: pushQueue,
      audit: auditQueue,
      emailDlq: emailDlq,
      smsDlq: smsDlq,
      pushDlq: pushDlq,
      auditDlq: auditDlq,
    };

    // 6. Create Lambda functions to process each queue
    this.createProcessorLambdas();
  }

  private createProcessorLambdas() {
    // Email processor Lambda
    const emailProcessor = new lambda.NodejsFunction(this, "EmailProcessor", {
      entry: join(__dirname, "../src/processors/email-processor.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      reservedConcurrentExecutions: 10,
      environment: {
        EMAIL_QUEUE_URL: this.queues.email.queueUrl,
      },
    });

    // SMS processor Lambda
    const smsProcessor = new lambda.NodejsFunction(this, "SmsProcessor", {
      entry: join(__dirname, "../src/processors/sms-processor.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(3),
      reservedConcurrentExecutions: 5,
      environment: {
        SMS_QUEUE_URL: this.queues.sms.queueUrl,
      },
    });

    // Push notification processor Lambda
    const pushProcessor = new lambda.NodejsFunction(this, "PushProcessor", {
      entry: join(__dirname, "../src/processors/push-processor.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(2),
      reservedConcurrentExecutions: 15,
      environment: {
        PUSH_QUEUE_URL: this.queues.push.queueUrl,
      },
    });

    // Audit processor Lambda
    const auditProcessor = new lambda.NodejsFunction(this, "AuditProcessor", {
      entry: join(__dirname, "../src/processors/audit-processor.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.minutes(10),
      reservedConcurrentExecutions: 2,
      environment: {
        AUDIT_QUEUE_URL: this.queues.audit.queueUrl,
      },
    });

    // Grant permissions
    this.queues.email.grantConsumeMessages(emailProcessor);
    this.queues.sms.grantConsumeMessages(smsProcessor);
    this.queues.push.grantConsumeMessages(pushProcessor);
    this.queues.audit.grantConsumeMessages(auditProcessor);

    // Add SQS event sources
    emailProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(this.queues.email, {
        batchSize: 10,
        maxBatchingWindow: Duration.seconds(5),
      })
    );

    smsProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(this.queues.sms, {
        batchSize: 5,
        maxBatchingWindow: Duration.seconds(3),
      })
    );

    pushProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(this.queues.push, {
        batchSize: 15,
        maxBatchingWindow: Duration.seconds(2),
      })
    );

    auditProcessor.addEventSource(
      new lambdaEventSources.SqsEventSource(this.queues.audit, {
        batchSize: 1,
        maxBatchingWindow: Duration.seconds(10),
      })
    );
  }

  // Method to create a publisher Lambda
  public createPublisherLambda(): lambda.NodejsFunction {
    const publisherLambda = new lambda.NodejsFunction(
      this,
      "NotificationPublisher",
      {
        entry: join(__dirname, "../src/publisher/notification-publisher.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.seconds(30),
        environment: {
          SNS_TOPIC_ARN: this.topic.topicArn,
        },
      }
    );

    // Grant publish permissions
    this.topic.grantPublish(publisherLambda);

    return publisherLambda;
  }
}
