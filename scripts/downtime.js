/**
 * A single Downtime Action drafted, submitted, rejected, accepted, or final
 * @typedef {Object} DowntimeAction
 * @property {string} id - A unique ID to identify this todo.
 * @property {string} status - State of downtime action
 * @property {string} category - type of downtime action
 * @property {string} description - describes the specifics of the goals
 * @property {string} location - the place the downtime is happening
 * @property {string} costs - required expenses, or extra contributions
 * @property {string} contingencies - plans if things go wrong
 * @property {string} rolls - rolls desired to use
 * @property {string} userId - rolls desired to use
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
        DOWNTIMEACTION: `modules/${this.ID}/templates/downtime.hbs`
    }
}

class DowntimeActionData {
    static getDowntimesForUser(userId) {
        return game.users.get(userId)?.getFlag(DowntimeActions.ID, DowntimeActions.FLAGS.ACTIONS);
    }

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
}