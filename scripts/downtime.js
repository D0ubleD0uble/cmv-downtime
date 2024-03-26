/**
 * A single Downtime Action drafted, submitted, rejected, accepted, or final
 * @typedef {Object} DowntimeAction
 * @property {string} id - A unique ID to identify this todo.
 * @property {string} status - state of downtime action
 * @property {string} character - name of the character
 * @property {string} category - type of downtime action
 * @property {string} description - describes the specifics of the goals
 * @property {string} location - the place the downtime is happening
 * @property {string} costs - required expenses, or extra contributions
 * @property {string} contingencies - plans if things go wrong
 * @property {string} rolls - rolls desired to use
 * @property {string} userId - creating user of the downtime action
 */

console.log("cmv-downtime | Hello World! This code runs immediately when the file is loaded.");

Hooks.on("init", function () {
    console.log("cmv-downtime | This code runs once the Foundry VTT software begins its initialization workflow.");
});

Hooks.on("ready", function () {
    console.log("cmv-downtime | This code runs once core initialization is ready and game data is available.");
});

/**
 * class which holds some constants for Downtime Actions
 */
class DowntimeActions {
    static ID = 'cmv-downtime';

    static FLAGS = {
        ACTIONS: 'actions'
    }

    static TEMPLATES = {
        DOWNTIMELIST: `modules/${this.ID}/templates/downtime-list.hbs`,
        DOWNTIMEACTION: `modules/${this.ID}/templates/downtime-action.hbs`
    }

    static initialize() {
        this.DowntimeListConfig = new DowntimeListConfig();
        this.DowntimeActionConfig = new DowntimeActionConfig();
    }
}

class DowntimeActionData {

    static createDowntime(userId, downtimeData) {
        // generate a random id for this new downtime and populate the userId
        const newDowntime = {
            status: "draft",
            ...downtimeData,
            id: foundry.utils.randomID(16),
            userId,
        }

        // construct the update to insert the new downtime
        const newDowntimes = {
            [newDowntime.id]: newDowntime
        }

        // update the database with the new downtimes
        return game.users.get(userId)?.setFlag(DowntimeActions.ID, DowntimeActions.FLAGS.ACTIONS, newDowntimes);
    }

    static getDowntimesForUser(userId) {
        return game.users.get(userId)?.getFlag(DowntimeActions.ID, DowntimeActions.FLAGS.ACTIONS);
    }

    static getDowntimeForUser(userId, downtimeId) {
        const relevantDowntime = this.getDowntimesForUser(userId)[downtimeId];

        return relevantDowntime;
    }

    static get allDowntimes() {
        const allDowntimes = game.users.reduce((accumulator, user) => {
            const userDowntimes = this.getDowntimesForUser(user.id);
            return {
                ...accumulator,
                ...userDowntimes
            }
        }, {});

        return allDowntimes;
    }

    static updateDowntime(downtimeId, updateData) {
        const relevantDowntime = this.allDowntimes[downtimeId];

        // construct the update to send
        const update = {
            [downtimeId]: updateData
        }

        // update the database with the updated downtime
        return game.users.get(relevantDowntime.userId)?.setFlag(DowntimeActions.ID, DowntimeActions.FLAGS.ACTIONS, update);
    }

    static deleteDowntime(downtimeId) {
        const relevantDowntime = this.allDowntimes[downtimeId];

        // Foundry specific syntax required to delete a key from a persisted object in the database
        const keyDeletion = {
            [`-=${downtimeId}`]: null
        }

        // update the database with the deleted downtime
        return game.users.get(relevantDowntime.userId)?.setFlag(DowntimeActions.ID, DowntimeActions.FLAGS.ACTIONS, keyDeletion);
    }
}

Hooks.once('init', () => {
    DowntimeActions.initialize();
});

Hooks.on('renderPlayerList', (playerList, html) => {
    // find the element which has our logged in user's id
    const loggedInUserListItem = html.find(`[data-user-id="${game.userId}"]`);

    // create localized tooltip
    const tooltip = game.i18n.localize('CMV-Downtime.button-title');

    //insert a button at the end of this element
    loggedInUserListItem.append("<button type='button' class='downtime-action-icon-button flex0'><i class='fas fa-tasks'></i></button>");

    // register an event listener for this button
    html.on('click', '.downtime-action-icon-button', (event) => {
        const userId = $(event.currentTarget).parents('[data-user-id]')?.data()?.userId;
        DowntimeActions.DowntimeListConfig.render(true, { userId });
    });
});

class DowntimeListConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrrides = {
            height: 'auto',
            id: 'downtime-list',
            template: DowntimeActions.TEMPLATES.DOWNTIMELIST,
            title: 'Downtime Actions',
            userId: game.userId,
            closeOnSubmit: false, // do not close when submitted
            submitOnChange: true, // submit when any input changes
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrrides);
        return mergedOptions;
    }

    getData(options) {
        return {
            downtimes: DowntimeActionData.getDowntimesForUser(options.userId)
        }
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        await DowntimeActionData.updateUserToDos(this.options.userId, expandedData);
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const downtimeId = clickedElement.parents('[data-downtime-id]')?.data()?.downtimeId;
        console.log('CMV Downtime | button_clicked with downtime id:', downtimeId);

        switch (action) {
            case 'create': {
                await DowntimeActionData.createDowntime(this.options.userId);
                this.render();
                break;
            }

            case 'edit': {
                DowntimeActions.DowntimeActionConfig.render(true, { userId: this.options.userId, downtimeId: downtimeId });
                break;
            }

            case 'delete': {
                await DowntimeActionData.deleteDowntime(downtimeId);
                this.render();
                break;
            }

            default:
                console.log('CMV Downtime | Invalid form action detected.', action);
        }
    }
}

class DowntimeActionConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;
        console.log(defaults);

        const overrrides = {
            height: 'auto',
            id: 'downtime-action',
            template: DowntimeActions.TEMPLATES.DOWNTIMEACTION,
            title: 'Downtime Action',
            userId: game.userId,
            closeOnSubmit: false, // do not close when submitted
            submitOnChange: true, // submit when any input changes
        };

        const mergedOptions = foundry.utils.mergeObject(defaults, overrrides);
        return mergedOptions;
    }

    getData(options) {
        console.log('CMV Downtime | options', options);
        return {
            downtime: DowntimeActionData.getDowntimeForUser(options.userId, options.downtimeId)
        }
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        await DowntimeActionData.updateDowntime(this.options.downtimeId, expandedData);
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const downtimeId = clickedElement.parents('[data-downtime-id]')?.data()?.downtimeId;

        switch (action) {

            default:
                console.log('CMV Downtime | Invalid form action detected.', action);
        }
    }
}