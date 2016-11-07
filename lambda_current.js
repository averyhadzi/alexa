var http = require('http');

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
* Called when the session starts.
*/
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
                + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
                + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    return getWelcomeResponse(callback);
}
/**
* Called when the user specifies an intent for this skill.
*/
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
                + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;


    // Dispatch to your skill's intent handlers
    if ("UDIntent" === intentName) {
        getUDResponse(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName) {
         exitSkill(callback);
    } else if ("AMAZON.CancelIntent" === intentName) {
         exitSkill(callback);
    } else {
        getWelcomeResponse(callback);
    }
}

/**
 * Called when the user cancels or stops the intent.
 */
function exitSkill(callback) {
    // Say goodbye
    var sessionAttributes = {};
    var cardTitle = "Urban Dictionary Lookup";
    var speechOutput = "See ya.";
    var shouldEndSession = true;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
* Called when the user ends the session.
* Is not called when the skill returns shouldEndSession=true.
*/
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getUDResponse(intent, session, callback) {
    var cardTitle = 'Urban Dictionary Lookup';
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput;

    // Get defition of search term from Urban Dictionary
    var searchTerm = intent.slots.UDTerm.value;
    var url = 'http://api.urbandictionary.com/v0/define?term=' + searchTerm;
    
    console.log('search term: ' + searchTerm);

    if(searchTerm == null) {
        speechOutput = 'Please ask me to define a word or phrase.';
    } else {
        http.get(url, function(res) {
            var body = '';
          
            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                var jsonBody = JSON.parse(body);
                
                if(jsonBody.result_type == 'no_results') {
                    speechOutput = "Sorry, I could not find the definition of " + searchTerm;
                } else {
                    var definition = jsonBody.list[0].definition;
                    var example = jsonBody.list[0].example;

                    // var audioArr = jsonBody.sounds;


                    speechOutput = searchTerm +  '. Definition: ' + definition + '. An example used in proper context is, ' + example;
                }    

                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            });
        }).on('error', function (e) {
            console.log("Got error: ", e);
            speechOutput = 'Cannot reach Urban Dictionary at this time. Please try again later.';
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    };
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Urban Dictionary Lookup";
    var speechOutput = "Welcome to Urban Dictionary Lookup, "
                + "What would you like to define? For example, say define blank.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please say, Urban Dictionary define blank.";
    var shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


function getHelpResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Urban Dictionary Lookup";
    var speechOutput = "Welcome to Urban Dictionary Lookup, "
        + "What would you like to define? For example, say define blank.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Which word would you like a definition for?";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}
