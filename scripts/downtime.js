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
 * @property {string} gmresults - gm-logged results
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
        return game.users.get(relevantDowntime.userId)?.setFlag(DowntimeActions.ID, DowntimeActions.FLAGS.ACTIONS, updateData);
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
        if (game.user.role === 4) {
            return {
                downtimes: DowntimeActionData.allDowntimes
            }
        }
        else {
            return {
                downtimes: DowntimeActionData.getDowntimesForUser(options.userId)
            }
        }
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
        window.Handlebars.registerHelper('select', function (value, options) {
            var $el = $('<select />').html(options.fn(this));
            $el.find('[value="' + value + '"]').attr({ 'selected': 'selected' });
            return $el.html();
        });
        window.Handlebars.registerHelper('isDowntimeDisabled', function (dtFieldName, status, userId) {
            if (status === 'draft') {
                if (game.user.role === 4) {
                    switch (dtFieldName) {

                        case 'close_button': {
                            return '';
                        }

                        case 'label': {
                            return '';
                        }

                        default:
                            return 'hidden';
                    }
                }
                else {
                    switch (dtFieldName) {

                        case 'submit_button': {
                            return '';
                        }

                        case 'close_button': {
                            return '';
                        }

                        case 'player_edit': {
                            return '';
                        }

                        default:
                            return 'hidden';
                    }
                }
            }
            else if (status === 'submitted') {
                if (game.user.role === 4) {
                    switch (dtFieldName) {
                        case 'accept_button': {
                            return '';
                        }

                        case 'reject_button': {
                            return '';
                        }

                        case 'close_button': {
                            return '';
                        }

                        case 'label': {
                            return '';
                        }

                        case 'gmresults': {
                            return '';
                        }

                        default:
                            return 'hidden';
                    }
                }
                else {
                    switch (dtFieldName) {

                        case 'close_button': {
                            return '';
                        }

                        case 'label': {
                            return '';
                        }

                        default:
                            return 'hidden';
                    }
                }
            }
            else {
                switch (dtFieldName) {

                    case 'close_button': {
                        return '';
                    }

                    case 'label': {
                        return '';
                    }

                    case 'gmlabel': {
                        return '';
                    }

                    default:
                        return 'hidden';
                }
            }
        });
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const downtimeId = clickedElement.parents('[data-downtime-id]')?.data()?.downtimeId;

        switch (action) {
            case 'create': {
                await DowntimeActionData.createDowntime(this.options.userId);
                this.render();
                break;
            }

            case 'edit': {
                //var downtimeData = DowntimeActionData.getDowntimeForUser(this.options.userId, downtimeId.toString());
                var downtimes = DowntimeActionData.allDowntimes;
                var downtimeData = downtimes[downtimeId];
                new DowntimeActionConfig(downtimeData, this).render(true);
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
    constructor(data, parent) {
        super();
        this.data = data;
        this.parent = parent;
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions;

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

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);
        this.data = expandedData[this.data.id];
        console.log('CMV Downtime | new data', this.data);
        await DowntimeActionData.updateDowntime(this.data.id, expandedData);
        this.parent.render();
        this.render();
    }

    getData() {
        return this.data;
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
            case 'accept': {
                // Get downtime submission
                var element = document.getElementsByName(this.data.id + ".status")[0];
                element.value = "completed";
                // Fire change for form submit
                document.getElementsByName("DowntimeActionForm")[0].onsubmit(new Event('submit'));
                break;
            }

            case 'reject': {
                // Get downtime submission
                var element = document.getElementsByName(this.data.id + ".status")[0];
                element.value = "draft";
                // Fire change for form submit
                document.getElementsByName("DowntimeActionForm")[0].onsubmit(new Event('submit'));
                break;
            }

            case 'submit': {
                // Get downtime submission
                var element = document.getElementsByName(this.data.id + ".status")[0];
                element.value = "submitted";
                // Fire change for form submit
                document.getElementsByName("DowntimeActionForm")[0].onsubmit(new Event('submit'));
                break;
            }

            case 'close': {
                this.close();
                break;
            }

            default:
                console.log('CMV Downtime | Invalid form action detected.', action);
        }
    }
}