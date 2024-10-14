// import * as cdk from "aws-cdk-lib";
// import { IRole } from "aws-cdk-lib/aws-iam";
// import * as lex from "aws-cdk-lib/aws-lex";
// import { Construct } from "constructs";

// export class ComplexFlowBotStack extends cdk.Stack {
//   constructor(
//     scope: Construct,
//     id: string,
//     props?: cdk.StackProps,
//     role: IRole
//   ) {
//     super(scope, id, props);

//     const bot = new lex.CfnBot(this, "ComplexFlowBot", {
//       name: "ComplexFlowBot",
//       dataPrivacy: {
//         ChildDirected: false,
//       },
//       idleSessionTtlInSeconds: 300,
//       roleArn: role.roleArn,
//       botLocales: [
//         {
//           localeId: "en_US",
//           nluConfidenceThreshold: 0.4,
//           intents: [
//             {
//               name: "MainTopicIntent",
//               sampleUtterances: [
//                 { utterance: "Tell me about topics" },
//                 { utterance: "What can I learn?" },
//               ],
//               slots: [
//                 // Slot for choosing between Topic A or Topic B
//                 {
//                   name: "TopicChoice",
//                   slotTypeName: "AMAZON.AlphaNumeric",
//                   valueElicitationSetting: {
//                     slotConstraint: "Required",
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value:
//                                 "Would you like to learn about Topic A or Topic B?",
//                             },
//                             imageResponseCard: {
//                               title: "Topic Options",
//                               subtitle: "Please choose:",
//                               buttons: [
//                                 { text: "Topic A", value: "A" },
//                                 { text: "Topic B", value: "B" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 // Slot for choosing subtopic (if Topic A is chosen)
//                 {
//                   name: "SubtopicAChoice",
//                   slotTypeName: "AMAZON.AlphaNumeric",
//                   valueElicitationSetting: {
//                     slotConstraint: "Optional", // Only asked if Topic A is chosen
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value:
//                                 "You chose Topic A. Would you like to explore Subtopic A1 or Subtopic A2?",
//                             },
//                             imageResponseCard: {
//                               title: "Subtopic A Options",
//                               subtitle: "Choose a subtopic:",
//                               buttons: [
//                                 { text: "Subtopic A1", value: "A1" },
//                                 { text: "Subtopic A2", value: "A2" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                     conditional: {
//                       condition: {
//                         expression: "Equals",
//                         slotName: "TopicChoice",
//                         value: "A",
//                       },
//                       nextStep: "SubtopicAChoice",
//                     },
//                   },
//                 },
//                 // Slot for choosing subtopic (if Topic B is chosen)
//                 {
//                   name: "SubtopicBChoice",
//                   slotTypeName: "AMAZON.AlphaNumeric",
//                   valueElicitationSetting: {
//                     slotConstraint: "Optional", // Only asked if Topic B is chosen
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value:
//                                 "You chose Topic B. Would you like to explore Subtopic B1 or Subtopic B2?",
//                             },
//                             imageResponseCard: {
//                               title: "Subtopic B Options",
//                               subtitle: "Choose a subtopic:",
//                               buttons: [
//                                 { text: "Subtopic B1", value: "B1" },
//                                 { text: "Subtopic B2", value: "B2" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                     conditional: {
//                       condition: {
//                         expression: "Equals",
//                         slotName: "TopicChoice",
//                         value: "B",
//                       },
//                       nextStep: "SubtopicBChoice",
//                     },
//                   },
//                 },
//                 // Further branching based on Subtopic A1 (Level 3)
//                 {
//                   name: "DetailsOrExamplesA1",
//                   slotTypeName: "AMAZON.AlphaNumeric",
//                   valueElicitationSetting: {
//                     slotConstraint: "Optional",
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value:
//                                 "You chose Subtopic A1. Would you like more details or some examples?",
//                             },
//                             imageResponseCard: {
//                               title: "Details or Examples",
//                               subtitle: "Choose an option:",
//                               buttons: [
//                                 { text: "Details", value: "Details" },
//                                 { text: "Examples", value: "Examples" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                     conditional: {
//                       condition: {
//                         expression: "Equals",
//                         slotName: "SubtopicAChoice",
//                         value: "A1",
//                       },
//                       nextStep: "DetailsOrExamplesA1",
//                     },
//                   },
//                 },
//                 // Further branching based on Subtopic B2 (Level 3)
//                 {
//                   name: "AdvancedOrBasicB2",
//                   slotTypeName: "AMAZON.AlphaNumeric",
//                   valueElicitationSetting: {
//                     slotConstraint: "Optional",
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value:
//                                 "You chose Subtopic B2. Would you like to continue with an advanced or basic topic?",
//                             },
//                             imageResponseCard: {
//                               title: "Advanced or Basic",
//                               subtitle: "Choose your preference:",
//                               buttons: [
//                                 { text: "Advanced", value: "Advanced" },
//                                 { text: "Basic", value: "Basic" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                     conditional: {
//                       condition: {
//                         expression: "Equals",
//                         slotName: "SubtopicBChoice",
//                         value: "B2",
//                       },
//                       nextStep: "AdvancedOrBasicB2",
//                     },
//                   },
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     });
//   }
// }
