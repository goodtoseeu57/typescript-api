// const AWS = require("aws-sdk");
// const lexruntime = new AWS.LexRuntimeV2();

// exports.handler = async (event) => {
//   const userMessage = event.body.message; // Get user input from the request body
//   const sessionId = event.body.sessionId || "default"; // Session tracking

//   const params = {
//     botId: "your-lex-bot-id", // Replace with your bot ID
//     botAliasId: "your-alias-id", // Replace with your bot alias ID
//     localeId: "en_US",
//     sessionId: sessionId,
//     text: userMessage,
//   };

//   try {
//     const lexResponse = await lexruntime.recognizeText(params).promise();

//     const message =
//       lexResponse.messages[0].content || "Sorry, I couldn't understand that.";

//     return {
//       statusCode: 200,
//       body: JSON.stringify({
//         message: message,
//         sessionId: sessionId,
//       }),
//     };
//   } catch (error) {
//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         error: "Error processing Lex request",
//         details: error.message,
//       }),
//     };
//   }
// };
