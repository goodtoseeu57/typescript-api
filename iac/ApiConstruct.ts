import { Stack } from "aws-cdk-lib";
import {
  RestApi,
  LambdaIntegration,
  DomainName,
  EndpointType,
  SecurityPolicy,
  AwsIntegration,
} from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { Key } from "aws-cdk-lib/aws-kms";
import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lex from "aws-cdk-lib/aws-lex";

interface LambdaConfig {
  functionName: string;
  handler: string;
  resourcePath: string;
  httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  codePath: string;
}

const lambdaConfigs: LambdaConfig[] = [
  {
    functionName: "CreateNote",
    handler: "createNote.handler",
    resourcePath: "create-note",
    httpMethod: "POST",
    codePath: join(
      __dirname,
      "./../src/resources/my-lambdas/create-note",
      "index.ts"
    ),
  },
];

export class ApiConstruct extends Construct {
  constructor(private readonly scope: Stack, id: string) {
    super(scope, id);
  }
  public createRestApi() {
    const api = new RestApi(this, "my-api", {
      restApiName: "my-api",
      description: "This is my api",
    });

    lambdaConfigs.forEach((config) => {
      const lambda = this.createLambdaFunction(config);
      const integration = new LambdaIntegration(lambda);
      // const lexIntegration = new AwsIntegration({
      //   service: 'lex',
      //   action: 'RecognizeText',
      //   options: {
      //     credentialsRole: apiGatewayLexRole,
      //     requestTemplates: {
      //       'application/json': JSON.stringify({
      //         botAliasId: botAlias.ref,
      //         botId: lexBot.ref,
      //         localeId: 'en_GB',
      //         sessionId: "$context.requestId",
      //         text: "$input.json('$.inputText')"
      //       })
      //     },
      //     integrationResponses: [{
      //       statusCode: '200',
      //     }],
      //   },
      // });
      api.root
        .addResource(config.resourcePath)
        .addMethod(config.httpMethod, integration);
    });

    this.setUpLex();
    return api;
  }

  setUpLex() {
    const botRuntimeRole = new iam.Role(this, "BotRuntimeRole", {
      assumedBy: new iam.ServicePrincipal("lexv2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonLexFullAccess"),
      ],
    });

    const lexLambda = new NodejsFunction(this, "lex", {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "./../src/resources/my-lambdas/lex", "index.ts"),
      handler: "lex.handler",
    });

    // Grant Lex permissions to invoke the Lambda function
    lexLambda.grantInvoke(botRuntimeRole);

    const myBot = new lex.CfnBot(this, "MyBot", {
      roleArn: botRuntimeRole.roleArn,
      name: "MyBotWithCDK",
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      botLocales: [
        {
          localeId: "en_GB",
          nluConfidenceThreshold: 0.4,
          intents: [
            {
              name: "CreateNoteIntent",
              description: "Intent to create a new note",
              sampleUtterances: [
                { utterance: "Create a new note" },
                { utterance: "I want to make a note" },
                { utterance: "Add a note" },
              ],
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
            {
              name: "FallbackIntent",
              parentIntentSignature: "AMAZON.FallbackIntent",
            },
          ],
        },
      ],
    });

    // Bot Version: A snapshot of the bot
    const botVersion = new lex.CfnBotVersion(this, "BookTripBotVersion", {
      botId: myBot.ref,
      botVersionLocaleSpecification: [
        {
          localeId: "en_GB",
          botVersionLocaleDetails: { sourceBotVersion: "DRAFT" },
        },
      ],
    });

    // Bot Alias: A pointer to a specific bot version
    const botAlias = new lex.CfnBotAlias(this, "BookTripBotAlias", {
      botId: myBot.ref,
      botAliasName: "BookTripVersion1Alias",
      botVersion: botVersion.attrBotVersion,
      botAliasLocaleSettings: [
        {
          localeId: "en_GB",
          botAliasLocaleSetting: {
            enabled: true,
            codeHookSpecification: {
              lambdaCodeHook: {
                lambdaArn: lexLambda.functionArn,
                codeHookInterfaceVersion: "1.0",
              },
            },
          },
        },
      ],
    });

    new cdk.CfnOutput(this, "LexBotId", {
      value: myBot.ref,
      description: "Lex Bot ID",
    });

    new cdk.CfnOutput(this, "LexBotAliasId", {
      value: botAlias.attrBotAliasId,
      description: "Lex Bot Alias ID",
    });
  }

  private createLambdaFunction(config: LambdaConfig): NodejsFunction {
    return new NodejsFunction(this, config.functionName, {
      runtime: Runtime.NODEJS_20_X,
      entry: config.codePath,
      handler: config.handler,
    });
  }
}
