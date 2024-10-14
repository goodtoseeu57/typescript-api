import * as cdk from "aws-cdk-lib";
import { IRole } from "aws-cdk-lib/aws-iam";
import * as lex from "aws-cdk-lib/aws-lex";
import { Construct } from "constructs";

export class NestedTreeBotStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    role: IRole,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    const bot = new lex.CfnBot(this, "NestedTreeBot", {
      name: "NestedTreeBot",
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      roleArn: role.roleArn,
      botLocales: [
        {
          localeId: "en_US",
          nluConfidenceThreshold: 0.4,
          intents: [
            {
              name: "NestedTreeIntent",
              sampleUtterances: [
                { utterance: "Start decision process" },
                { utterance: "Begin the process" },
              ],
              slots: [
                // Slot for Level 1 choice with an image response card
                {
                  name: "Level1Option",
                  slotTypeName: "AMAZON.AlphaNumeric",
                  valueElicitationSetting: {
                    slotConstraint: "Required",
                    promptSpecification: {
                      allowInterrupt: true,
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            imageResponseCard: {
                              title: "Level 1 Options",
                              subtitle: "Choose your option:",
                              buttons: [
                                { text: "A", value: "A" },
                                { text: "B", value: "B" },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                // Slot for Level 2 choice with an image response card
                {
                  name: "Level2Option",
                  slotTypeName: "AMAZON.AlphaNumeric",
                  valueElicitationSetting: {
                    slotConstraint: "Required",
                    promptSpecification: {
                      allowInterrupt: true,
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            imageResponseCard: {
                              title: "Level 2 Options",
                              subtitle: "Choose your option:",
                              buttons: [
                                { text: "C", value: "C" },
                                { text: "D", value: "D" },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                // Slot for Level 3 choice with an image response card
                {
                  name: "Level3Option",
                  slotTypeName: "AMAZON.AlphaNumeric",
                  valueElicitationSetting: {
                    slotConstraint: "Required",
                    promptSpecification: {
                      allowInterrupt: true,
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            plainTextMessage: {
                              value: "Please choose E or F for level 3.",
                            },
                            imageResponseCard: {
                              title: "Level 3 Options",
                              subtitle: "Choose your option:",
                              buttons: [
                                { text: "E", value: "E" },
                                { text: "F", value: "F" },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                // Continue defining slots for Levels 4 to 10 similarly
                {
                  name: "Level4Option",
                  slotTypeName: "AMAZON.AlphaNumeric",
                  valueElicitationSetting: {
                    slotConstraint: "Required",
                    promptSpecification: {
                      allowInterrupt: true,
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            imageResponseCard: {
                              title: "Level 4 Options",
                              subtitle: "Choose your option:",
                              buttons: [
                                { text: "G", value: "G" },
                                { text: "H", value: "H" },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                // Define more slots (Level 5 to Level 10)...
                {
                  name: "Level5Option",
                  slotTypeName: "AMAZON.AlphaNumeric",
                  valueElicitationSetting: {
                    slotConstraint: "Required",
                    promptSpecification: {
                      allowInterrupt: true,
                      maxRetries: 2,
                      messageGroupsList: [
                        {
                          message: {
                            imageResponseCard: {
                              title: "Level 5 Options",
                              subtitle: "Choose your option:",
                              buttons: [
                                { text: "I", value: "I" },
                                { text: "J", value: "J" },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                // Continue similarly for Levels 6 through 10...
              ],
            },
          ],
        },
      ],
    });
  }
}
