import { Stack } from "aws-cdk-lib";
import {
  RestApi,
  LambdaIntegration,
  TokenAuthorizer,
} from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";

import { Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

import { Construct } from "constructs";
import { join } from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lex from "aws-cdk-lib/aws-lex";
import { GetSessionCommand } from "@aws-sdk/client-lex-runtime-v2";

interface LambdaConfig {
  functionName: string;
  handler: string;
  resourcePath: string;
  httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  codePath: string;
}

const lambdaConfigs: LambdaConfig[] = [
  {
    functionName: "NewCreateNote",
    handler: "index.handler",
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
    const { botAlias, botId } = setUpLex(this);

    const authorizerFn = new NodejsFunction(this, "AuthorizerFunction", {
      runtime: Runtime.NODEJS_20_X,
      role: authorizerLambdaRole,
      functionName: "AuthorizerFunction",
      timeout: cdk.Duration.seconds(30),
      handler: "index.handler",
      environment: {
        COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID!,
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID!,
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
      const lambda = this.createLambdaFunction(config, basicLambdaRole, {
        botAlias,
        botId,
      });
      const integration = new LambdaIntegration(lambda);

      api.root
        .addResource(config.resourcePath)
        .addMethod(config.httpMethod, integration, { authorizer });
    });

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

    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonLexRunBotsOnly")
    );

    return lambdaRole;
  }

  setUpLexWithLambda() {
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
      autoBuildBotLocales: true,
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
    const botAlias = new lex.CfnBotAlias(this, "BookTripBotAliasUS", {
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

    return { botAlias: botAlias.attrBotAliasId, botId: myBot.ref };
  }

  private createLambdaFunction(
    config: LambdaConfig,
    role: iam.IRole,
    envConfig: { botAlias: string; botId: string }
  ): NodejsFunction {
    return new NodejsFunction(this, config.functionName, {
      runtime: Runtime.NODEJS_20_X,
      role: role,
      timeout: cdk.Duration.seconds(30),
      environment: {
        BOT_ALIAS: envConfig.botAlias,
        BOT_ID: envConfig.botId,
      },
      entry: config.codePath,
      handler: config.handler,
    });
  }
}

function setUpLex(scope: Construct) {
  const botRuntimeRole = new iam.Role(scope, "BotRuntimeRole", {
    assumedBy: new iam.ServicePrincipal("lexv2.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonLexFullAccess"),
    ],
  });

  // 2. Inline bot definition which depends on the IAM role
  const bookTripTemplateBot = new lex.CfnBot(scope, "BookTripTemplateBot3", {
    roleArn: botRuntimeRole.roleArn,
    name: "BookTripWithCFN",
    dataPrivacy: { ChildDirected: false },
    idleSessionTtlInSeconds: 300,
    description: "How to create a BookTrip bot with CDK",
    autoBuildBotLocales: true,
    botLocales: [
      {
        localeId: "en_GB",
        description: "Book a trip bot Locale",
        nluConfidenceThreshold: 0.7,
        slotTypes: [
          {
            name: "CarTypeValues",
            description: "Slot Type description",
            slotTypeValues: [
              { sampleValue: { value: "economy" } },
              { sampleValue: { value: "standard" } },
              { sampleValue: { value: "midsize" } },
              { sampleValue: { value: "full size" } },
              { sampleValue: { value: "luxury" } },
              { sampleValue: { value: "minivan" } },
            ],
            valueSelectionSetting: { resolutionStrategy: "ORIGINAL_VALUE" },
          },
        ],
        intents: [
          {
            name: "BookCar",
            description: "Intent to book a car on StayBooker",
            sampleUtterances: [
              { utterance: "Book a car" },
              { utterance: "Reserve a car" },
              { utterance: "Make a car reservation" },
            ],
            slotPriorities: [
              { priority: 4, slotName: "DriverAge" },
              { priority: 1, slotName: "PickUpCity" },
              { priority: 3, slotName: "ReturnDate" },
              { priority: 5, slotName: "CarType" },
              { priority: 2, slotName: "PickUpDate" },
            ],
            intentConfirmationSetting: {
              promptSpecification: {
                messageGroupsList: [
                  {
                    message: {
                      plainTextMessage: {
                        value:
                          "Okay, I have you down for a {CarType} rental in {PickUpCity} from {PickUpDate} to {ReturnDate}.  Should I book the reservation?",
                      },
                    },
                  },
                ],
                maxRetries: 3,
                allowInterrupt: false,
              },
              declinationResponse: {
                messageGroupsList: [
                  {
                    message: {
                      plainTextMessage: {
                        value:
                          "Okay, I have cancelled your reservation in progress pal",
                      },
                    },
                  },
                ],
                allowInterrupt: false,
              },
            },
            slots: [
              {
                name: "PickUpCity",
                description: "something",
                slotTypeName: "AMAZON.City",
                valueElicitationSetting: {
                  slotConstraint: "Required",
                  promptSpecification: {
                    messageGroupsList: [
                      {
                        message: {
                          plainTextMessage: {
                            value:
                              "In what city do you need to rent a car pal?",
                          },
                        },
                      },
                    ],
                    maxRetries: 3,
                    allowInterrupt: false,
                  },
                },
              },
              {
                name: "PickUpDate",
                description: "something",
                slotTypeName: "AMAZON.Date",
                valueElicitationSetting: {
                  slotConstraint: "Required",
                  promptSpecification: {
                    messageGroupsList: [
                      {
                        message: {
                          plainTextMessage: {
                            value: "What day do you want to start your rental?",
                          },
                        },
                      },
                    ],
                    maxRetries: 3,
                    allowInterrupt: false,
                  },
                },
              },
              {
                name: "ReturnDate",
                description: "something",
                slotTypeName: "AMAZON.Date",
                valueElicitationSetting: {
                  slotConstraint: "Required",
                  promptSpecification: {
                    messageGroupsList: [
                      {
                        message: {
                          plainTextMessage: {
                            value: "What day do you want to return the car?",
                          },
                        },
                      },
                    ],
                    maxRetries: 3,
                    allowInterrupt: false,
                  },
                },
              },
              {
                name: "DriverAge",
                description: "something",
                slotTypeName: "AMAZON.Number",
                valueElicitationSetting: {
                  slotConstraint: "Required",
                  promptSpecification: {
                    messageGroupsList: [
                      {
                        message: {
                          plainTextMessage: {
                            value: "How old is the driver for this rental?",
                          },
                        },
                      },
                    ],
                    maxRetries: 3,
                    allowInterrupt: false,
                  },
                },
              },
              {
                name: "CarType",
                description: "something",
                slotTypeName: "CarTypeValues",
                valueElicitationSetting: {
                  slotConstraint: "Required",
                  promptSpecification: {
                    messageGroupsList: [
                      {
                        message: {
                          plainTextMessage: {
                            value:
                              "What type of car would you like to rent?  Our most popular options are economy, midsize, and luxury",
                          },
                        },
                      },
                    ],
                    maxRetries: 3,
                    allowInterrupt: false,
                  },
                },
              },
            ],
          },

          {
            name: "FallbackIntent",
            description: "Default intent when no other intent matches",
            parentIntentSignature: "AMAZON.FallbackIntent",
          },
        ],
      },
    ],
  });
  const date = new Date();
  // 3. Define a bot version which depends on the DRAFT version of the Lex Bot
  const bookTripBotVersionWithCFN = new lex.CfnBotVersion(
    scope,
    `BookTripBotVersionWithCFN-${date.getTime()}`,
    {
      botId: bookTripTemplateBot.ref,
      botVersionLocaleSpecification: [
        {
          localeId: "en_GB",
          botVersionLocaleDetails: { sourceBotVersion: "DRAFT" },
        },
      ],
      description: "BookTrip Version",
    }
  );

  // 4. We define the alias by providing the bot version created by the AWS::Lex::BotVersion resource above
  const botAlias = new lex.CfnBotAlias(scope, "FirstBotAliasWithCFN", {
    botId: bookTripTemplateBot.ref,
    botAliasName: "BookTripVersion1Alias",
    botAliasLocaleSettings: [
      {
        localeId: "en_GB",
        botAliasLocaleSetting: {
          enabled: true,
        },
      },
    ],
    botVersion: bookTripBotVersionWithCFN.attrBotVersion,
    sentimentAnalysisSettings: { DetectSentiment: false },
  });

  return {
    botAlias: botAlias.attrBotAliasId,
    botId: bookTripBotVersionWithCFN.botId,
  };
}
