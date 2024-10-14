// import * as cdk from "aws-cdk-lib";
// import * as lex from "aws-cdk-lib/aws-lex";
// import { Construct } from "constructs";

// export class NestedTreeBotStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     // Define custom slot types for specific options at different levels
//     const level1SlotType = {
//       name: "Level1SlotType",
//       slotTypeValues: [
//         { sampleValue: { value: "A" } },
//         { sampleValue: { value: "B" } },
//       ],
//       valueSelectionSetting: { resolutionStrategy: "OriginalValue" },
//     };

//     const level2SlotType = {
//       name: "Level2SlotType",
//       slotTypeValues: [
//         { sampleValue: { value: "C" } },
//         { sampleValue: { value: "D" } },
//       ],
//       valueSelectionSetting: { resolutionStrategy: "OriginalValue" },
//     };

//     const level4SlotType = {
//       name: "Level4SlotType",
//       slotTypeValues: [
//         { sampleValue: { value: "G" } },
//         { sampleValue: { value: "H" } },
//       ],
//       valueSelectionSetting: { resolutionStrategy: "OriginalValue" },
//     };

//     const bot = new lex.CfnBot(this, "NestedTreeBot", {
//       name: "NestedTreeBot",
//       dataPrivacy: {
//         childDirected: false,
//       },
//       idleSessionTtlInSeconds: 300,
//       roleArn: "<your-lex-bot-role-arn>", // Replace with your Lex bot's role ARN
//       botLocales: [
//         {
//           localeId: "en_US",
//           nluConfidenceThreshold: 0.4,
//           intents: [
//             {
//               name: "NestedTreeIntent",
//               sampleUtterances: [
//                 { utterance: "Start decision process" },
//                 { utterance: "Begin the process" },
//               ],
//               slots: [
//                 // Slot for Level 1 choice
//                 {
//                   name: "Level1Option",
//                   slotTypeName: level1SlotType.attrSlotTypeName,
//                   valueElicitationSetting: {
//                     slotConstraint: "Required",
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value: "Please choose A or B for level 1.",
//                             },
//                             imageResponseCard: {
//                               title: "Level 1 Options",
//                               subtitle: "Choose your option:",
//                               buttons: [
//                                 { text: "A", value: "A" },
//                                 { text: "B", value: "B" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 // Slot for Level 2 choice (this can be similar for each path)
//                 {
//                   name: "Level2Option",
//                   slotTypeName: level2SlotType.attrSlotTypeName,
//                   valueElicitationSetting: {
//                     slotConstraint: "Required",
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value: "Please choose C or D for level 2.",
//                             },
//                             imageResponseCard: {
//                               title: "Level 2 Options",
//                               subtitle: "Choose your option:",
//                               buttons: [
//                                 { text: "C", value: "C" },
//                                 { text: "D", value: "D" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 // Slot for Level 4 choice with branching options
//                 {
//                   name: "Level4Option",
//                   slotTypeName: level4SlotType.attrSlotTypeName,
//                   valueElicitationSetting: {
//                     slotConstraint: "Required",
//                     promptSpecification: {
//                       allowInterrupt: true,
//                       maxRetries: 2,
//                       messageGroupsList: [
//                         {
//                           message: {
//                             plainTextMessage: {
//                               value: "Please choose G or H for level 4.",
//                             },
//                             imageResponseCard: {
//                               title: "Level 4 Options",
//                               subtitle: "Choose your option:",
//                               buttons: [
//                                 { text: "G", value: "G" },
//                                 { text: "H", value: "H" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
//                     },
//                   },
//                 },
//                 // Slot for branching based on G or H
//                 {
//                   name: "BranchingSlot",
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
//                                 "You have selected {Level4Option}. Let's proceed down the path.",
//                             },
//                             imageResponseCard: {
//                               title: "Branch Path",
//                               subtitle: "Choose your next step:",
//                               buttons: [
//                                 { text: "Option 1", value: "Option1" },
//                                 { text: "Option 2", value: "Option2" },
//                               ],
//                             },
//                           },
//                         },
//                       ],
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
