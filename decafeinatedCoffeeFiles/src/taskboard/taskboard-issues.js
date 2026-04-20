/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
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

class TaskboardIssuesService extends taiga.Service {
    static initClass() {
        this.$inject = [];
    }
    constructor() {
        this.reset();
    }

    reset() {
        this.foldStatusChanged = {};
        return this.issuesRaw = [];
    }

    init(project, usersById, issueStatusById) {
        this.issueStatusById = issueStatusById;
        this.project = project;
        return this.usersById = usersById;
    }

    resetFolds() {
        this.foldStatusChanged = {};
        return this.refresh();
    }

    toggleFold(issueId) {
        this.foldStatusChanged[issueId] = !this.foldStatusChanged[issueId];
        return this.refresh();
    }

    add(issue) {
        this.issuesRaw = this.issuesRaw.concat(issue);
        return this.refresh();
    }

    remove(issue) {
        for (var key in this.issuesRaw) {
            var item = this.issuesRaw[key];
            if (issue.id === item.id) {
                this.issuesRaw.splice(key, 1);
                this.refresh();
                return;
            }
        }
    }

    set(issues) {
        this.issuesRaw = issues;
        return this.refresh();
    }

    getIssue(id) {
        return this.milestoneIssues.find(issue => issue.get('id') === id);
    }

    getIssueModel(id) {
        return _.find(this.issuesRaw, issue => issue.id === id);
    }

    replaceModel(issue) {
        this.issuesRaw = _.map(this.issuesRaw, function(item) {
            if (issue.id === item.id) {
                return issue;
            } else {
                return item;
            }
        });

        return this.refresh();
    }

    refresh() {
        const issues = [];
        for (var issueModel of Array.from(this.issuesRaw)) {
            var issue = {};
            issue.foldStatusChanged = this.foldStatusChanged[issueModel.id];
            issue.model = issueModel.getAttrs();
            issue.modelName = issueModel.getName();
            issue.id = issueModel.id;
            issue.status = this.issueStatusById[issueModel.status];
            issue.images = _.filter(issue.model.attachments, it => !!it.thumbnail_card_url);
            issue.assigned_to = this.usersById[issueModel.assigned_to];
            issue.colorized_tags = _.map(issue.model.tags, tag => ({
                name: tag[0],
                color: tag[1]
            }));

            issues.push(issue);
        }

        return this.milestoneIssues = Immutable.fromJS(issues);
    }
}
TaskboardIssuesService.initClass();

angular.module("taigaKanban").service("tgTaskboardIssues", TaskboardIssuesService);
