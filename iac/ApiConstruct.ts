import { Stack } from "aws-cdk-lib";
import {
  RestApi,
  LambdaIntegration,
  DomainName,
  EndpointType,
  SecurityPolicy,
  AwsIntegration,
  RequestAuthorizer,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";

import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

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
  {
    functionName: "helloWorld",
    handler: "helloWorld.handler",
    resourcePath: "hello",
    httpMethod: "GET",
    codePath: join(
      __dirname,
      "./../src/resources/my-lambdas/hello-world",
      "index.ts"
    ),
  },
];

export class ApiConstruct extends Construct {
  constructor(private readonly scope: Stack, id: string) {
    super(scope, id);
  }
  public createRestApi() {
    const authorizerLambdaRole = this.createLambdaRole("AuthorizerLambdaRole");

    const authorizerFn = new NodejsFunction(this, "AuthorizerFunction", {
      runtime: Runtime.NODEJS_20_X,
      role: authorizerLambdaRole,
      functionName: "AuthorizerFunction",
      handler: "index.handler",
      environment: {
        COGNITO_USER_POOL_ID: "*",
        COGNITO_CLIENT_ID: "*",
      },
      entry: join(
        __dirname,
        "./../src/resources/my-lambdas/authorizer",
        "index.ts"
      ),
    });

    const authorizer = new TokenAuthorizer(this, "Authorizer", {
      handler: authorizerFn,
    });

    const api = new RestApi(this, "my-api", {
      restApiName: "my-api",
      description: "This is my api",
      defaultMethodOptions: {
        authorizer,
      },
    });

    const basicLambdaRole = this.createLambdaRole("BasicLambdaRole");

    lambdaConfigs.forEach((config) => {
      const lambda = this.createLambdaFunction(config, basicLambdaRole);
      const integration = new LambdaIntegration(lambda);

      api.root
        .addResource(config.resourcePath)
        .addMethod(config.httpMethod, integration, { authorizer });
    });

    // Set up Lex bot integration
    const { botAlias, botId } = this.setUpLex();
    console.log(botAlias, botId);

    return api;
  }

  public createLambdaRole(name: string) {
    const lambdaRole = new iam.Role(this, name, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    return lambdaRole;
  }

  setUpLex() {
    const lexBotRole = new iam.Role(this, "LexBotRole", {
      assumedBy: new iam.ServicePrincipal("lexv2.amazonaws.com"),
      inlinePolicies: {
        ["LexRuntimeRolePolicy"]: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: ["*"],
              actions: ["polly:SynthesizeSpeech", "comprehend:DetectSentiment"],
            }),
          ],
        }),
      },
    });

    const lexLambda = new NodejsFunction(this, "lex", {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, "./../src/resources/my-lambdas/lex", "index.ts"),
      handler: "lex.handler",
    });

    const myBot = new lex.CfnBot(this, "MyBot", {
      roleArn: lexBotRole.roleArn,
      name: "MyBotWithCDK",
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      testBotAliasSettings: {
        botAliasLocaleSettings: [
          {
            localeId: "en_GB",
            botAliasLocaleSetting: {
              enabled: true,
              codeHookSpecification: {
                lambdaCodeHook: {
                  codeHookInterfaceVersion: "1.0",
                  lambdaArn: lexLambda.functionArn,
                },
              },
            },
          },
        ],
      },
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
              dialogCodeHook: { enabled: true },
            },
            {
              name: "FallbackIntent",
              parentIntentSignature: "AMAZON.FallbackIntent",
            },
          ],
        },
      ],
    });

    lexLambda.addPermission("Lex Invocation", {
      principal: new iam.ServicePrincipal("lexv2.amazonaws.com"),
      sourceArn: `arn:aws:lex:${Stack.of(this).region}:${
        Stack.of(this).account
      }:bot-alias/${myBot.attrId}/*`,
    });

    new cdk.CfnOutput(this, "reminderBotLambdaLink", {
      value: `https://${
        Stack.of(this).region
      }.console.aws.amazon.com/lambda/home?region=${
        Stack.of(this).region
      }#/functions/${lexLambda.functionName}`,
    });

    new cdk.CfnOutput(this, "reminderBotLink", {
      value: `https://${
        Stack.of(this).region
      }.console.aws.amazon.com/lexv2/home?region=${
        Stack.of(this).region
      }#/bot/${myBot.attrId}`,
    });

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

    return { botAlias, botId: myBot.ref };
  }

  // createLexIntegration(
  //   botAlias: lex.CfnBotAlias,
  //   botId: string
  // ): AwsIntegration {
  //   const apiGatewayLexRole = new iam.Role(this, "ApiGatewayLexRole", {
  //     assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
  //     inlinePolicies: {
  //       ["LexIntegrationPolicy"]: new iam.PolicyDocument({
  //         statements: [
  //           new iam.PolicyStatement({
  //             actions: ["lex:RecognizeText"],
  //             resources: [
  //               `arn:aws:lex:${Stack.of(this).region}:${
  //                 Stack.of(this).account
  //               }:bot-alias/${botId}/${botAlias.attrBotAliasId}`,
  //             ],
  //           }),
  //         ],
  //       }),
  //     },
  //   });

  //   return new AwsIntegration({
  //     service: "lex",
  //     action: "RecognizeText",
  //     options: {
  //       credentialsRole: apiGatewayLexRole,
  //       integrationResponses: [
  //         {
  //           statusCode: "200",
  //           responseTemplates: {
  //             "application/json": `{
  //               "message": $input.path('$.messages[0].content')
  //             }`,
  //           },
  //         },
  //       ],
  //       requestTemplates: {
  //         "application/json": `{
  //           "botAliasId": "${botAlias.ref}",
  //           "botId": "${botId}",
  //           "localeId": "en_GB",
  //           "sessionId": "$context.requestId",
  //           "text": "$input.body"
  //         }`,
  //       },
  //     },
  //   });
  // }

  private createLambdaFunction(
    config: LambdaConfig,
    role: iam.IRole
  ): NodejsFunction {
    return new NodejsFunction(this, config.functionName, {
      runtime: Runtime.NODEJS_20_X,
      role: role,

      entry: config.codePath,
      handler: config.handler,
    });
  }
}
