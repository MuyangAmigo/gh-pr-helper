import { TeamsActivityHandler, CardFactory, TurnContext, Attachment, AdaptiveCardInvokeValue, AdaptiveCardInvokeResponse} from "botbuilder";
import { Octokit } from "@octokit/core";

const rawWelcomeCard = require("./adaptiveCards/welcome.json");
const rawLearnCard = require("./adaptiveCards/learn.json");
const rawPrCard = require("./adaptiveCards/listAllPrs.json");
const ACData = require("adaptivecards-templating");

export class TeamsBot extends TeamsActivityHandler {
  // record the likeCount
  likeCountObj: { likeCount: number };

  constructor() {
    super();

    this.likeCountObj = { likeCount: 0 };

    this.onMessage(async (context, next) => {
      console.log("Running with Message Activity.");

      let txt = context.activity.text;
      const removedMentionText = TurnContext.removeRecipientMention(
        context.activity
      );
      if (removedMentionText) {
        // Remove the line break
        txt = removedMentionText.toLowerCase().replace(/\n|\r/g, "").trim();
      }

      // Trigger command by IM text
      switch (txt) {
        case "welcome": {
          const card = this.renderAdaptiveCard(rawWelcomeCard);
          await context.sendActivity({ attachments: [card] });
          break;
        }
        case "learn": {
          this.likeCountObj.likeCount = 0;
          const card = this.renderAdaptiveCard(rawLearnCard, this.likeCountObj);
          await context.sendActivity({ attachments: [card] });
          break;
        }
        case "prs": {
          // Hard code to play around with github API. Need user login to obtain those information.
          const octokit = new Octokit({ auth: `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` });
          const response = await octokit.request('GET /repos/muyangamigo/gh-pr-helper/pulls', {
            owner: 'muyangamigo',
            repo: 'gh-pr-helper',
            state: 'all'
          })
          const data = {
            "items": response.data}
          const card = this.renderAdaptiveCard(rawPrCard, data);
          await context.sendActivity({ attachments: [card] })
          break;
        }
      }

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (let cnt = 0; cnt < membersAdded.length; cnt++) {
        if (membersAdded[cnt].id) {
          const card = this.renderAdaptiveCard(rawWelcomeCard);
          await context.sendActivity({ attachments: [card] });
          break;
        }
      }
      await next();
    });
  }

  // Invoked when an action is taken on an Adaptive Card. The Adaptive Card sends an event to the Bot and this
  // method handles that event.
  async onAdaptiveCardInvoke(
    context: TurnContext,
    invokeValue: AdaptiveCardInvokeValue
  ): Promise<AdaptiveCardInvokeResponse> {
    // The verb "userlike" is sent from the Adaptive Card defined in adaptiveCards/learn.json
    if (invokeValue.action.verb === "userlike") {
      this.likeCountObj.likeCount++;
      const card = this.renderAdaptiveCard(rawLearnCard, this.likeCountObj);
      await context.updateActivity({
        type: "message",
        id: context.activity.replyToId,
        attachments: [card],
      });
      return { statusCode: 200, type: undefined, value: undefined };
    }
  }

  // Bind AdaptiveCard with data
  renderAdaptiveCard(rawCardTemplate: any, dataObj?: any): Attachment {
    const cardTemplate = new ACData.Template(rawCardTemplate);
    const cardWithData = cardTemplate.expand({ $root: dataObj });
    const card = CardFactory.adaptiveCard(cardWithData);
    return card;
  }

}

