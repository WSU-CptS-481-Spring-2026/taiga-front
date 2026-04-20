/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
 * This source code is licensed under the terms of the
 * GNU Affero General Public License found in the LICENSE file in
 * the root directory of this source tree.
 *
 * Copyright (c) 2021-present Kaleidos INC
 */

import taiga from "taiga";
import angular from "angular";
import _ from 'lodash';
import Immutable from 'immutable';

class TaskboardTasksService extends taiga.Service {
    static initClass() {
        this.$inject = [];
    }
    constructor() {
        this.reset();
    }

    reset() {
        this.tasksRaw = [];
        this.foldStatusChanged = {};
        this.usTasks = Immutable.Map();
        this.tasksByUs = Immutable.Map();
        return this.taskMap = Immutable.Map();
    }

    init(project, usersById) {
        this.project = project;
        return this.usersById = usersById;
    }

    resetFolds() {
        this.foldStatusChanged = {};
        return this.refresh();
    }

    toggleFold(taskId) {
        this.foldStatusChanged[taskId] = !this.foldStatusChanged[taskId];
        return this.refresh();
    }

    add(task) {
        this.tasksRaw = this.tasksRaw.concat(task);
        return this.refresh();
    }

    set(tasks) {
        this.tasksRaw = tasks;
        this.refreshRawOrder();
        return this.refresh();
    }

    setUserstories(userstories) {
        return this.userstories = userstories;
    }

    refreshRawOrder() {
        this.order = {};

        return Array.from(this.tasksRaw).map((task) => (this.order[task.id] = task.taskboard_order));
    }

    assignOrders(order) {
        order = _.invert(order);
        this.order = _.assign(this.order, order);

        return this.refresh();
    }

    getTask(id) {
        return this.taskMap.get(id);
    }

    replace(task) {
        return this.taskMap = this.taskMap.set(task.get('id'), task);
    }

    getTaskModel(id) {
        return _.find(this.tasksRaw, task => task.id === id);
    }

    replaceModel(task) {
        this.tasksRaw = _.map(this.tasksRaw, function(it) {
            if (task.id === it.id) {
                return task;
            } else {
                return it;
            }
        });

        return this.refresh();
    }

    move(id, usId, statusId, index) {
        const task = this.getTaskModel(id);
        let taskByUsStatus = _.filter(this.tasksRaw, task => {
            return (task.status === statusId) && (task.user_story === usId);
        });
        taskByUsStatus = _.sortBy(taskByUsStatus, it => this.order[it.id]);
        const tasksWithoutMoved = _.filter(taskByUsStatus, it => it.id !== id);
        const beforeDestination = _.slice(tasksWithoutMoved, 0, index);
        const afterDestination = _.slice(tasksWithoutMoved, index);
        const setOrders = {};
        const previous = beforeDestination[beforeDestination.length - 1];

        const previousWithTheSameOrder = _.filter(beforeDestination, it => {
            return this.order[it.id] === this.order[previous.id];
        });

        if (previousWithTheSameOrder.length > 1) {
            for (let it of Array.from(previousWithTheSameOrder)) {
                setOrders[it.id] = this.order[it.id];
            }
        }

        this.order[task.id] = previous ? this.order[previous.id] + 1 : 0;

        for (let key = 0; key < afterDestination.length; key++) {
            let it = afterDestination[key];
            this.order[it.id] = this.order[task.id] + key + 1;
        }
        this.setTaskModel(task.id, usId, statusId, task);

        this.refresh();

        return {"task_id": task.id, "order": this.order[task.id], "set_orders": setOrders};
    }

    setTaskModel(id, usId, statusId, task) {
        task.status = statusId;
        task.user_story = usId;
        task.taskboard_order = this.order[task.id];
    }

    refresh() {
        if (!this.project) {
            return;
        }

        this.tasksRaw = _.sortBy(this.tasksRaw, it => this.order[it.id]);

        const tasks = this.tasksRaw;
        const taskStatusList = _.sortBy(this.project.task_statuses, "order");

        const usTasks = {};

        // Iterate over all userstories and
        // null userstory for unassigned tasks
        for (var us of Array.from(_.union(this.userstories, [{id:null}]))) {
            usTasks[us.id] = {};
            for (let status of Array.from(taskStatusList)) {
                usTasks[us.id][status.id] = [];
            }
        }

        for (var taskModel of Array.from(tasks)) {
            if ((usTasks[taskModel.user_story] != null) && (usTasks[taskModel.user_story][taskModel.status] != null)) {
                if (!this.tasksByUs.get(taskModel.user_story)) {
                    this.tasksByUs = this.tasksByUs.set(taskModel.user_story, Immutable.fromJS([taskModel.id]));
                } else {
                    this.tasksByUs = this.tasksByUs.set(taskModel.user_story, this.tasksByUs.get(taskModel.user_story).push(taskModel.id));
                }

                var model = taskModel.getAttrs();
                const task = {
                    foldStatusChanged: this.foldStatusChanged[taskModel.id],
                    model,
                    images: _.filter(model.attachments, it => !!it.thumbnail_card_url),
                    id: taskModel.id,
                    assigned_to: this.usersById[taskModel.assigned_to],
                    colorized_tags: _.map(model.tags, ([name, color]) => ({ name, color }))
                }

                this.taskMap = this.taskMap.set(task.id, Immutable.fromJS(task));
                usTasks[taskModel.user_story][taskModel.status].push(task.id);
            }
        }

        return this.usTasks = Immutable.fromJS(usTasks);
    }
}
TaskboardTasksService.initClass();

angular.module("taigaKanban").service("tgTaskboardTasks", TaskboardTasksService);
