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

const {
    taiga
} = this;
const {
    toggleText
} = this.taiga;
const {
    mixOf
} = this.taiga;
const {
    groupBy
} = this.taiga;
const {
    bindOnce
} = this.taiga;
const {
    scopeDefer
} = this.taiga;
const {
    timeout
} = this.taiga;
const {
    bindMethods
} = this.taiga;
const {
    debounceLeading
} = this.taiga;

const module = angular.module("taigaTaskboard");


//############################################################################
//# Taskboard Controller
//############################################################################

class TaskboardController extends mixOf(taiga.Controller, taiga.PageMixin, taiga.FiltersMixin) {
    static initClass() {
        this.$inject = [
            "$scope",
            "$rootScope",
            "$tgRepo",
            "$tgConfirm",
            "$tgResources",
            "tgResources",
            "$routeParams",
            "$q",
            "tgAppMetaService",
            "$tgLocation",
            "$tgNavUrls",
            "$tgEvents",
            "$tgAnalytics",
            "$translate",
            "tgErrorHandlingService",
            "tgTaskboardTasks",
            "tgTaskboardIssues",
            "$tgStorage",
            "tgFilterRemoteStorageService",
            "tgLightboxFactory",
            "$timeout",
            "tgProjectService"
        ];
    
        this.prototype.excludePrefix = "exclude_";
        this.prototype.filterCategories = [
            "status",
            "assigned_to",
            "owner",
            "role",
            "tags"
        ];
    
        this.prototype.validQueryParams = [
            'exclude_status',
            'status',
            'exclude_assigned_to',
            'assigned_to',
            'exclude_role',
            'role',
            'exclude_owner',
            'owner',
            'order_by',
            'tags'
        ];
    }

    constructor(scope, rootscope, repo, confirm, rs, rs2, params, q, appMetaService, location, navUrls,
                  events, analytics, translate, errorHandlingService, taskboardTasksService,
                  taskboardIssuesService, storage, filterRemoteStorageService, lightboxFactory, timeout1, projectService) {
        this.scope = scope;
        this.rootscope = rootscope;
        this.repo = repo;
        this.confirm = confirm;
        this.rs = rs;
        this.rs2 = rs2;
        this.params = params;
        this.q = q;
        this.appMetaService = appMetaService;
        this.location = location;
        this.navUrls = navUrls;
        this.events = events;
        this.analytics = analytics;
        this.translate = translate;
        this.errorHandlingService = errorHandlingService;
        this.taskboardTasksService = taskboardTasksService;
        this.taskboardIssuesService = taskboardIssuesService;
        this.storage = storage;
        this.filterRemoteStorageService = filterRemoteStorageService;
        this.lightboxFactory = lightboxFactory;
        this.timeout = timeout1;
        this.projectService = projectService;
        bindMethods(this);
        this.taskboardTasksService.reset();
        this.scope.userstories = [];
        this.openFilter = false;
        this.filterQ = '';
        this.editingSprintName = false;
        this.backToBacklogUrl = this.navUrls.resolve('project-backlog', {
            project: this.projectService.project.get('slug'),
            ref: this.params.ref
        });

        if (this.applyStoredFilters(this.params.pslug, "tasks-filters", this.validQueryParams)) { return; }

        this.scope.sectionName = this.translate.instant("TASKBOARD.SECTION_NAME");
        this.initializeEventHandlers();

        taiga.defineImmutableProperty(this.scope, "usTasks", () => {
            return this.taskboardTasksService.usTasks;
        });

        taiga.defineImmutableProperty(this.scope, "taskMap", () => {
            return this.taskboardTasksService.taskMap;
        });

        taiga.defineImmutableProperty(this.scope, "milestoneIssues", () => {
            return this.taskboardIssuesService.milestoneIssues;
        });

        taiga.defineImmutableProperty(this.scope, "tasksByUs", () => {
            return this.taskboardTasksService.tasksByUs;
        });

        this.scope.issues = [];
        this.scope.showTags = true;

        this.scope.$watch('milestoneIssues', () => {
            if (this.scope.milestoneIssues) {
                return this.scope.issues = this.scope.milestoneIssues.toJS().map(milestoneIssue => {
                    return this.taskboardIssuesService.issuesRaw.find(rawIssue => milestoneIssue.model.id === rawIssue.id);
                });
            } else {
                return this.scope.issues = [];
            }
    });
    }

    getQueryParams() {
        return _.pick(_.clone(this.location.search()), this.validQueryParams);
    }

    firstLoad() {
        const promise = this.loadInitialData();

        // On Success
        promise.then(() => this._setMeta());
        // On Error
        return promise.then(null, this.onInitialDataError.bind(this));
    }

    setZoom(zoomLevel, zoom) {
        if (this.zoomLevel === Number(zoomLevel)) {
            return null;
        }

        this.isFirstLoad = !this.zoomLevel;

        const previousZoomLevel = this.zoomLevel;

        this.zoomLevel = zoomLevel;
        this.zoom = zoom;

        if (this.isFirstLoad) {
            return this.firstLoad().then(() => {
                this.isFirstLoad = false;
                return this.taskboardTasksService.resetFolds();
            });

        } else if ((this.zoomLevel > 1) && (previousZoomLevel <= 1)) {
            this.zoomLoading = true;
            return this.q.all([this.loadTasks(), this.loadIssues()]).then(() => {
                this.zoomLoading = false;
                return this.taskboardTasksService.resetFolds();
            });
        }
    }

    changeQ(q) {
        this.filterQ = q;
        this.loadTasks();
        return this.generateFilters();
    }

    removeFilter(filter) {
        this.unselectFilter(filter.dataType, filter.id, false, filter.mode);
        this.loadTasks();
        return this.generateFilters();
    }

    addFilter(newFilter) {
        this.selectFilter(newFilter.category.dataType, newFilter.filter.id, false, newFilter.mode);
        this.loadTasks();
        return this.generateFilters();
    }

    selectCustomFilter(customFilter) {
        this.replaceAllFilters(customFilter.filter);
        this.loadTasks();
        return this.generateFilters();
    }

    removeCustomFilter(customFilter) {
        return this.filterRemoteStorageService.getFilters(this.scope.projectId, 'tasks-custom-filters').then(userFilters => {
            delete userFilters[customFilter.id];

            return this.filterRemoteStorageService.storeFilters(this.scope.projectId, userFilters, 'tasks-custom-filters').then(this.generateFilters);
        });
    }

    isFilterDataTypeSelected(filterDataType) {
        for (var filter of Array.from(this.selectedFilters)) {
            if (filter['dataType'] === filterDataType) {
                return true;
            }
        }
        return false;
    }

    saveCustomFilter(name) {
        const filters = {};
        const urlfilters = this.getQueryParams();
        for (var key of Array.from(this.filterCategories)) {
            var excludeKey = this.excludePrefix.concat(key);
            filters[key] = urlfilters[key];
            filters[excludeKey] = urlfilters[excludeKey];
        }

        return this.filterRemoteStorageService.getFilters(this.scope.projectId, 'tasks-custom-filters').then(userFilters => {
            userFilters[name] = filters;

            return this.filterRemoteStorageService.storeFilters(this.scope.projectId, userFilters, 'tasks-custom-filters').then(this.generateFilters);
        });
    }

    generateFilters() {
        let excludeKey, key;
        const urlfilters = this.getQueryParams();
        this.storeFilters(this.params.pslug, urlfilters, "tasks-filters");

        const loadFilters = {};
        loadFilters.project = this.scope.projectId;
        loadFilters.milestone = this.scope.sprintId;

        for (key of Array.from(this.filterCategories)) {
            excludeKey = this.excludePrefix.concat(key);
            loadFilters[key] = urlfilters[key];
            loadFilters[excludeKey] = urlfilters[excludeKey];
        }

        return this.q.all([
            this.rs.tasks.filtersData(loadFilters),
            this.filterRemoteStorageService.getFilters(this.scope.projectId, 'tasks-custom-filters')
        ]).then(result => {
            const data = result[0];
            const customFiltersRaw = result[1];
            const dataCollection = {};

            dataCollection.status = _.map(data.statuses, function(it) {
                it.id = it.id.toString();

                return it;
            });
            dataCollection.tags = _.map(data.tags, function(it) {
                it.id = it.name;

                return it;
            });

            const tagsWithAtLeastOneElement = _.filter(dataCollection.tags, tag => tag.count > 0);

            dataCollection.assigned_to = _.map(data.assigned_to, function(it) {
                if (it.id) {
                    it.id = it.id.toString();
                } else {
                    it.id = "null";
                }

                it.name = it.full_name || "Unassigned";

                return it;
            });
            dataCollection.role = _.map(data.roles, function(it) {
                if (it.id) {
                    it.id = it.id.toString();
                } else {
                    it.id = "null";
                }

                it.name = it.name || "Unassigned";

                return it;
            });
            dataCollection.owner = _.map(data.owners, function(it) {
                it.id = it.id.toString();
                it.name = it.full_name;

                return it;
            });

            this.selectedFilters = [];

            for (key of Array.from(this.filterCategories)) {
                var selected;
                excludeKey = this.excludePrefix.concat(key);
                if (loadFilters[key]) {
                    selected = this.formatSelectedFilters(key, dataCollection[key], loadFilters[key]);
                    this.selectedFilters = this.selectedFilters.concat(selected);
                }
                if (loadFilters[excludeKey]) {
                    selected = this.formatSelectedFilters(key, dataCollection[key], loadFilters[excludeKey], "exclude");
                    this.selectedFilters = this.selectedFilters.concat(selected);
                }
            }

            this.filters = [
                {
                    title: this.translate.instant("COMMON.FILTERS.CATEGORIES.STATUS"),
                    dataType: "status",
                    content: dataCollection.status
                },
                {
                    title: this.translate.instant("COMMON.FILTERS.CATEGORIES.TAGS"),
                    dataType: "tags",
                    content: dataCollection.tags,
                    hideEmpty: true,
                    totalTaggedElements: tagsWithAtLeastOneElement.length
                },
                {
                    title: this.translate.instant("COMMON.FILTERS.CATEGORIES.ASSIGNED_TO"),
                    dataType: "assigned_to",
                    content: dataCollection.assigned_to
                },
                {
                    title: this.translate.instant("COMMON.FILTERS.CATEGORIES.ROLE"),
                    dataType: "role",
                    content: dataCollection.role
                },
                {
                    title: this.translate.instant("COMMON.FILTERS.CATEGORIES.CREATED_BY"),
                    dataType: "owner",
                    content: dataCollection.owner
                }
            ];

            this.customFilters = [];
            return _.forOwn(customFiltersRaw, (value, key) => {
                return this.customFilters.push({id: key, name: key, filter: value});
            });
        });
    }

    _setMeta() {
        const prettyDate = this.translate.instant("BACKLOG.SPRINTS.DATE");

        const title = this.translate.instant("TASKBOARD.PAGE_TITLE", {
            projectName: this.scope.project.name,
            sprintName: this.scope.sprint.name
        });
        const description =  this.translate.instant("TASKBOARD.PAGE_DESCRIPTION", {
            projectName: this.scope.project.name,
            sprintName: this.scope.sprint.name,
            startDate: moment(this.scope.sprint.estimated_start).format(prettyDate),
            endDate: moment(this.scope.sprint.estimated_finish).format(prettyDate),
            completedPercentage: this.scope.stats.completedPercentage || "0",
            completedPoints: this.scope.stats.completedPointsSum || "--",
            totalPoints: this.scope.stats.totalPointsSum || "--",
            openTasks: this.scope.stats.openTasks || "--",
            totalTasks: this.scope.stats.total_tasks || "--"
        });

        return this.appMetaService.setAll(title, description);
    }

    initializeEventHandlers() {
        this.scope.$on("taskform:bulk:success", (event, tasks) => {
            this.refreshTagsColors().then(() => {
                return this.taskboardTasksService.add(tasks);
            });

            return this.analytics.trackEvent("task", "create", "bulk create task on taskboard", 1);
        });

        this.scope.$on("taskform:new:success", (event, task) => {
            this.refreshTagsColors().then(() => {
                return this.taskboardTasksService.add(task);
            });

            return this.analytics.trackEvent("task", "create", "create task on taskboard", 1);
        });

        this.scope.$on("taskform:edit:success", (event, task) => {
            return this.refreshTagsColors().then(() => {
                return this.taskboardTasksService.replaceModel(task);
            });
        });

        this.scope.$on("issueform:new:success", (event, issue) => {
            this.refreshTagsColors().then(() => {
                return this.taskboardIssuesService.add(issue);
            });

            return this.analytics.trackEvent("issue", "create", "create issue on taskboard", 1);
        });

        this.scope.$on("issueform:add:success", (event, issue) => {
            return this.refreshTagsColors().then(() => {
                return this.taskboardIssuesService.add(issue);
            });
        });

        this.scope.$on("issueform:edit:success", (event, issue) => {
            return this.refreshTagsColors().then(() => {
                return this.taskboardIssuesService.replaceModel(issue);
            });
        });

        this.scope.$on("taskboard:task:deleted", (event, task) => {
            return this.loadTasks();
        });

        this.scope.$on("taskboard:issue:deleted", (event, issue) => {
            return this.loadIssues();
        });

        this.scope.$on("taskboard:task:move", this.taskMove);
        this.scope.$on("assigned-to:added", this.onAssignedToChanged);

        return this.scope.$on("taskboard:items:move", (event, itemsMoved) => {
            if (itemsMoved.uss) {
                return this.firstLoad();
            } else {
                if (itemsMoved.tasks) { this.loadTasks(); }
                if (itemsMoved.issues) { return this.loadIssues(); }
            }
        });
    }

    onAssignedToChanged(ctx, userid, model) {
        if (model.getName() === 'tasks') {
            model.assigned_to = userid;
            this.taskboardTasksService.replaceModel(model);

            this.repo.save(model).then(() => {
                this.generateFilters();
                if (this.isFilterDataTypeSelected('assigned_to') || this.isFilterDataTypeSelected('role')) {
                    return this.loadTasks();
                }
            });
        }
        if (model.getName() === 'issues') {
            model.assigned_to = userid;
            this.taskboardIssuesService.replaceModel(model);

            return this.repo.save(model).then(() => {
                this.generateFilters();
                if (this.isFilterDataTypeSelected('assigned_to') || this.isFilterDataTypeSelected('role')) {
                    return this.loadIssues();
                }
            });
        }
    }

    initializeSubscription() {
        let routingKey = `changes.project.${this.scope.projectId}.tasks`;
        this.events.subscribe(this.scope, routingKey, debounceLeading(500, message => {
            return this.loadTaskboard();
    })
        );

        routingKey = `changes.project.${this.scope.projectId}.issues`;
        this.events.subscribe(this.scope, routingKey, debounceLeading(500, message => {
            return this.loadIssues();
    })
        );

        const routingKey1 = `changes.project.${this.scope.projectId}.userstories`;
        return this.events.subscribe(this.scope, routingKey1, message => {
            this.refreshTagsColors();
            this.loadSprintStats();
            return this.loadSprint();
        });
    }

    loadProject() {
        return this.rs.projects.get(this.scope.projectId).then(project => {
            if (!project.is_backlog_activated) {
                this.errorHandlingService.permissionDenied();
            }

            this.scope.project = project;
            // Not used at this momment
            this.scope.pointsList = _.sortBy(project.points, "order");
            this.scope.pointsById = groupBy(project.points, e => e.id);
            this.scope.roleById = groupBy(project.roles, e => e.id);
            this.scope.taskStatusList = _.sortBy(project.task_statuses, "order");
            this.scope.usStatusList = _.sortBy(project.us_statuses, "order");
            this.scope.usStatusById = groupBy(project.us_statuses, e => e.id);
            this.scope.issueStatusById = groupBy(project.issue_statuses, e => e.id);

            this.scope.$emit('project:loaded', project);

            this.fillUsersAndRoles(project.members, project.roles);

            return project;
        });
    }

    loadSprintStats() {
        return this.rs.sprints.stats(this.scope.projectId, this.scope.sprintId).then(stats => {
            const totalPointsSum =_.reduce(_.values(stats.total_points), ((res, n) => res + n), 0);
            const completedPointsSum = _.reduce(_.values(stats.completed_points), ((res, n) => res + n), 0);
            const remainingPointsSum = totalPointsSum - completedPointsSum;
            const remainingTasks = stats.total_tasks - stats.completed_tasks;
            this.scope.stats = stats;
            this.scope.stats.totalPointsSum = totalPointsSum;
            this.scope.stats.completedPointsSum = completedPointsSum;
            this.scope.stats.remainingPointsSum = remainingPointsSum;
            this.scope.stats.remainingTasks = remainingTasks;
            if (stats.totalPointsSum) {
                this.scope.stats.completedPercentage = Math.round((100*stats.completedPointsSum)/stats.totalPointsSum);
            } else {
                this.scope.stats.completedPercentage = 0;
            }

            this.scope.stats.openTasks = stats.total_tasks - stats.completed_tasks;
            return stats;
        });
    }

    refreshTagsColors() {
        return this.rs.projects.tagsColors(this.scope.projectId).then(tags_colors => {
            return this.scope.project.tags_colors = tags_colors._attrs;
        });
    }

    loadSprint() {
        return this.rs.sprints.get(this.scope.projectId, this.scope.sprintId).then(sprint => {
            this.scope.sprint = sprint;
            this.scope.userstories = _.sortBy(sprint.user_stories, "sprint_order");

            this.taskboardTasksService.setUserstories(this.scope.userstories);

            this.rootscope.$broadcast("taskboard:userstories:loaded", this.scope.userstories);
            return sprint;
        });
    }

    loadIssues() {
        let params = {};

        if (this.zoomLevel > 1) {
            params.include_attachments = 1;
        }

        const locationParams = this.getQueryParams();
        params = _.merge(params, locationParams);

        return this.rs.issues.listInProject(this.scope.projectId, this.scope.sprintId, params).then(issues => {
            this.taskboardIssuesService.init(this.scope.project, this.scope.usersById, this.scope.issueStatusById);
            this.taskboardIssuesService.set(issues);
            return this.initIssues = true;
        });
    }

    loadTasks() {
        let params = {};

        if (this.zoomLevel > 1) {
            params.include_attachments = 1;
        }

        const locationParams = this.getQueryParams();
        params = _.merge(params, locationParams);
        params.q = this.filterQ;

        return this.rs.tasks.list(this.scope.projectId, this.scope.sprintId, null, params).then(tasks => {
            this.notFoundTasks = false;

            if (!tasks.length && ((this.filterQ && this.filterQ.length) || Object.keys(locationParams).length)) {
                this.notFoundTasks = true;
            }

            this.taskboardTasksService.init(this.scope.project, this.scope.usersById);
            return this.taskboardTasksService.set(tasks);
        });
    }

    loadTaskboard() {
        return this.q.all([
            this.refreshTagsColors(),
            this.loadSprintStats(),
            this.loadSprint().then(() => {
                this.loadTasks();
                return this.loadIssues();
            })
        ]);
    }

    loadInitialData() {
        this.initialLoad = false;
        this.initIssues = false;

        const params = {
            pslug: this.params.pslug,
            sslug: this.params.sslug
        };

        const promise = this.repo.resolve(params).then(data => {
            this.scope.projectId = data.project;
            this.scope.sprintId = data.milestone;
            this.initializeSubscription();
            return data;
        });

        return promise.then(() => this.loadProject()).then(() => {
            this.generateFilters();

            if (this.rs.issues.getSprintShowTags(this.scope.projectId) === false) {
                this.scope.showTags = false;
            }

            return this.loadTaskboard().then(() => {
                this.timeout(() => {
                    return this.initialLoad = true;
                }
                , 0, false);
                return this.setRolePoints();
            });
        });
    }

    toggleTags(tags) {
        return this.rs.issues.storeSprintShowTags(this.scope.projectId, tags);
    }

    showPlaceHolder(statusId, usId) {
        if (!this.taskboardTasksService.tasksRaw.length) {
            if ((this.scope.taskStatusList[0].id === statusId) &&
              (!this.scope.userstories.length || (this.scope.userstories[0].id === usId))) {
                return true;
            }
        }

        return false;
    }

    editTask(id) {
        let task = this.taskboardTasksService.getTask(id);

        task = task.set('loading-edit', true);
        this.taskboardTasksService.replace(task);

        return this.rs.tasks.getByRef(task.getIn(['model', 'project']), task.getIn(['model', 'ref']))
        .then(editingTask => {
            return this.rs2.attachments.list("task", task.get('id'), task.getIn(['model', 'project']))
            .then(attachments => {
                this.rootscope.$broadcast("genericform:edit", {
                    'objType': 'task',
                    'obj': editingTask,
                    'project': this.scope.project,
                    'sprintId': this.scope.sprintId,
                    'attachments': attachments.toJS()
                });

                task = task.set('loading-edit', false);
                return this.taskboardTasksService.replace(task);
            });
        });
    }

    editIssue(id) {
        let issue = this.taskboardIssuesService.getIssue(id);
        issue = issue.set('loading-edit', true);

        return this.rs.issues.getByRef(issue.getIn(['model', 'project']), issue.getIn(['model', 'ref']))
        .then(editingIssue => {
            return this.rs2.attachments.list("issue", issue.get('id'), issue.getIn(['model', 'project']))
            .then(attachments => {
                this.rootscope.$broadcast("genericform:edit", {
                    'objType': 'issue',
                    'obj': editingIssue,
                    'project': this.scope.project,
                    'sprintId': this.scope.sprintId,
                    'attachments': attachments.toJS()
                });
                return issue = issue.set('loading-edit', false);
            });
        });
    }

    deleteTask(id) {
        let task = this.taskboardTasksService.getTask(id);
        task = task.set('loading-delete', true);

        return this.rs.tasks.getByRef(task.getIn(['model', 'project']), task.getIn(['model', 'ref']))
        .then(deletingTask => {
            task = task.set('loading-delete', false);
            const title = this.translate.instant("TASK.TITLE_DELETE_ACTION");
            const message = deletingTask.subject;
            return this.confirm.askOnDelete(title, message).then(askResponse => {
                const promise = this.repo.remove(deletingTask);
                promise.then(() => {
                    this.scope.$broadcast("taskboard:task:deleted");
                    return askResponse.finish();
                });
                return promise.then(null, function() {
                    askResponse.finish(false);
                    return this.confirm.notify("error");
                });
            });
        });
    }

    deleteIssue(id) {
        let issue = this.taskboardIssuesService.getIssue(id);
        issue = issue.set('loading-delete', true);

        return this.rs.issues.getByRef(issue.getIn(['model', 'project']), issue.getIn(['model', 'ref']))
        .then(deletingIssue => {
            issue = issue.set('loading-delete', false);
            const title = this.translate.instant("ISSUES.ACTION_DELETE");
            const message = deletingIssue.subject;
            return this.confirm.askOnDelete(title, message).then(askResponse => {
                const promise = this.repo.remove(deletingIssue);
                promise.then(() => {
                    this.scope.$broadcast("taskboard:issue:deleted");
                    return askResponse.finish();
                });
                return promise.then(null, function() {
                    askResponse.finish(false);
                    return this.confirm.notify("error");
                });
            });
        });
    }

    removeIssueFromSprint(id) {
        let issue = this.taskboardIssuesService.getIssue(id);
        issue = issue.set('loading-delete', true);

        return this.rs.issues.getByRef(issue.getIn(['model', 'project']), issue.getIn(['model', 'ref']))
        .then(removingIssue => {
            issue = issue.set('loading-delete', false);
            const title = this.translate.instant("ISSUES.CONFIRM_DETACH_FROM_SPRINT.TITLE");
            let message = this.translate.instant("ISSUES.CONFIRM_DETACH_FROM_SPRINT.MESSAGE");
            message = this.translate.instant(
                "ISSUES.CONFIRM_DETACH_FROM_SPRINT.MESSAGE",
                {sprintName: this.scope.sprint.name}
            );

            return this.confirm.ask(title, null, message).then(askResponse => {
                removingIssue.milestone = null;
                const promise = this.repo.save(removingIssue);
                promise.then(() => {
                    this.taskboardIssuesService.remove(removingIssue);
                    return askResponse.finish();
                });
                return promise.then(null, function() {
                    askResponse.finish(false);
                    return this.confirm.notify("error");
                });
            });
        });
    }

    taskMove(ctx, task, oldStatusId, usId, statusId, order) {
        let promise;
        this.scope.movingTask = true;
        task = this.taskboardTasksService.getTaskModel(task.get('id'));

        const moveUpdateData = this.taskboardTasksService.move(task.id, usId, statusId, order);

        const params = {
            status__is_archived: false,
            include_attachments: true,
        };

        const options = {
            headers: {
                "set-orders": JSON.stringify(moveUpdateData.set_orders)
            }
        };

        return promise = this.repo.save(task, true, params, options, true).then(result => {
            if (result[0] && result[0].user_story) {
                this.reloadUserStory(result[0].user_story);
            }

            this.scope.movingTask = false;
            const headers = result[1];

            if (headers && headers['taiga-info-order-updated']) {
                order = JSON.parse(headers['taiga-info-order-updated']);
                this.taskboardTasksService.assignOrders(order);
            }

            this.loadSprintStats();
            this.generateFilters();
            if (this.isFilterDataTypeSelected('status')) {
                return this.loadTasks();
            }
        });
    }

    reloadUserStory(userStoryId) {
        return this.rs.userstories.get(this.scope.project.id, userStoryId).then(us => {
            return this.scope.userstories = _.map(this.scope.userstories, function(x) { if (x.id === us.id) { return us; } else { return x; } });
        });
    }

    //# Template actions
    addNewTask(type, us) {
        switch (type) {
            case "standard": return this.rootscope.$broadcast("genericform:new",
                {
                    'objType': 'task',
                    'project': this.scope.project,
                    'sprintId': this.scope.sprintId,
                    'usId': (us != null ? us.id : undefined)
                });
            case "bulk": return this.rootscope.$broadcast("taskform:bulk", this.scope.sprintId, us != null ? us.id : undefined);
        }
    }

    addNewIssue(type, us) {
        switch (type) {
            case "standard": return this.rootscope.$broadcast("genericform:new-or-existing",
                {
                    objType: 'issue',
                    project: this.scope.project,
                    sprintId: this.scope.sprintId,
                    relatedField: 'milestone',
                    relatedObjectId: this.scope.sprintId,
                    targetName: this.scope.sprint.name,
                });
            case "standard": return this.rootscope.$broadcast("taskform:new", this.scope.sprintId, us != null ? us.id : undefined);
            case "bulk": return this.rootscope.$broadcast("issueform:bulk", this.scope.projectId, this.scope.sprintId);
        }
    }

    toggleFold(id,  modelName) {
        if (modelName === 'issues') {
            return this.taskboardIssuesService.toggleFold(id);
        } else if (modelName === 'tasks') {
            return this.taskboardTasksService.toggleFold(id);
        }
    }

    openUsersSelection(item) {
        const onClose = assignedUsers => {
            const userId = assignedUsers.pop() || null;

            if (item.getName() === 'tasks') {
                item.assigned_to = userId;
                this.taskboardTasksService.replaceModel(item);

                this.repo.save(item).then(() => {
                    this.generateFilters();
                    if (this.isFilterDataTypeSelected('assigned_to') || this.isFilterDataTypeSelected('role')) {
                        return this.loadTasks();
                    }
                });
            }

            if (item.getName() === 'issues') {
                item.assigned_to = userId;
                this.taskboardIssuesService.replaceModel(item);

                return this.repo.save(item).then(() => {
                    this.generateFilters();
                    if (this.isFilterDataTypeSelected('assigned_to') || this.isFilterDataTypeSelected('role')) {
                        return this.loadIssues();
                    }
                });
            }
        };

        return this.lightboxFactory.create(
            'tg-lb-select-user',
            {
                "class": "lightbox lightbox-select-user",
            },
            {
                "currentUsers": [item.assigned_to],
                "activeUsers": this.scope.activeUsers,
                "onClose": onClose,
                "single": true,
                "lbTitle": this.translate.instant("COMMON.ASSIGNED_USERS.ADD"),
            }
        );
    }

    changeTaskAssignedTo(id) {
        const task = this.taskboardTasksService.getTaskModel(id);
        return this.openUsersSelection(task);
    }

    changeIssueAssignedTo(id) {
        const issue = this.taskboardIssuesService.getIssueModel(id);
        return this.openUsersSelection(issue);
    }

    setRolePoints() {
        const computableRoles = _.filter(this.scope.project.roles, "computable");

        const getRole = roleId => {
            roleId = parseInt(roleId, 10);
            return _.find(computableRoles, role => role.id === roleId);
        };

        const getPoint = pointId => {
            const poitnId = parseInt(pointId, 10);
            return _.find(this.scope.project.points, point => point.id === pointId);
        };

        const pointsByRole = _.reduce(this.scope.userstories, (result, us, key) => {
            _.forOwn(us.points, function(pointId, roleId) {
                const role = getRole(roleId);
                const point = getPoint(pointId) || { value: 0 };

                if (role) {
                    if (!result[role.id]) {
                        result[role.id] = role;
                        result[role.id].points = 0;
                    }

                    return result[role.id].points += point.value;
                }
            });

            return result;
        }
        , {});

        return this.scope.pointsByRole = Object.keys(pointsByRole).map(key => pointsByRole[key]);
    }

    getIssuesOrderBy() {
        if (_.isString(this.location.search().order_by)) {
            return this.location.search().order_by;
        } else {
            return "created_date";
        }
    }

    editSprint() {
        this.editedSprintName = this.scope.sprint.name;
        return this.editingSprintName = true;
    }


    saveSprintName() {
        const {
            sprint
        } = this.scope;
        if (sprint == null) { return; }
        const newName = this.editedSprintName;
        this.scope.sprint.name = newName;
        return this.repo.save(sprint).then(() => {
            this.scope.sprint.name = newName;
            return this.editingSprintName = false;
        });
    }
}
TaskboardController.initClass();

module.controller("TaskboardController", TaskboardController);


//############################################################################
//# TaskboardDirective
//############################################################################

const TaskboardDirective = function($rootscope) {
    const link = function($scope, $el, $attrs) {
        const $ctrl = $el.controller();

        $el.on("click", ".toggle-analytics-visibility", function(event) {
            event.preventDefault();
            const target = angular.element(event.currentTarget);
            target.toggleClass('active');
            return $rootscope.$broadcast("taskboard:graph:toggle-visibility");
        });

        const tableBodyDom = $el.find('[data-js="taskboard-table-hscroll"]');
        tableBodyDom.on("scroll", function(event) {
            const target = angular.element(event.currentTarget);
            const tableHeaderDom = $el.find(".taskboard-table-inner");
            return tableHeaderDom.css("left", -1 * target.scrollLeft());
        });

        return $scope.$on("$destroy", () => $el.off());
    };

    return {link};
};

module.directive("tgTaskboard", ["$rootScope", TaskboardDirective]);

//############################################################################
//# Taskboard Squish Column Directive
//############################################################################

const TaskboardSquishColumnDirective = function(rs) {
    const gridGap = 5;
    const horizontalPadding = 32;
    const avatarWidth = 30;
    const maxColumnWidth = 292;
    const zoom0ColumnWidth = 182;
    const minWidth = avatarWidth + horizontalPadding;
    const maxRows = 3;
    let firstLoad = false;

    const link = function($scope, $el, $attrs) {
        let recalculateTaskboardWidth;
        $scope.$watch("ctrl.zoom", () => {
            if (firstLoad) {
                return recalculateTaskboardWidth();
            }
        });

        $scope.$on("sprint:task:moved", () => {
            return recalculateTaskboardWidth();
        });

        $scope.$watch("usTasks", function() {
            if ($scope.project) {
                $scope.statusesFolded = rs.tasks.getStatusColumnModes($scope.project.id);
                $scope.usFolded = rs.tasks.getUsRowModes($scope.project.id, $scope.sprintId);

                return recalculateTaskboardWidth();
            }
        });

        $scope.foldStatus = function(status) {
            $scope.statusesFolded[status.id] = !!!$scope.statusesFolded[status.id];
            rs.tasks.storeStatusColumnModes($scope.projectId, $scope.statusesFolded);

            return recalculateTaskboardWidth();
        };

        const $foldStatusArchived = status => $scope.foldStatus(status);

        $scope.foldUs = function(rowId) {
            $scope.usFolded[rowId] = !!!$scope.usFolded[rowId];
            rs.tasks.storeUsRowModes($scope.projectId, $scope.sprintId, $scope.usFolded);

            return recalculateTaskboardWidth();
        };

        const getCeilWidth = (usId, statusId) => {
            let tasks, width;
            const isStatusFolded = !!$scope.statusesFolded[statusId];
            const isUSFolded = !!$scope.usFolded[usId];

            if (usId) {
                tasks = $scope.usTasks.getIn([usId.toString(), statusId.toString()]).size;
            } else {
                tasks = $scope.usTasks.getIn(['null', statusId.toString()]).size;
            }

            if (tasks && (isUSFolded || isStatusFolded)) {
                if (isUSFolded) {
                    const columns = Math.ceil(tasks / maxRows);
                    width = (avatarWidth * columns) + ((columns - 1) * gridGap) + horizontalPadding;
                } else if (isStatusFolded) {
                    width = avatarWidth;
                }
            } else {
                width = 0;
            }

            return width;
        };

        const setStatusColumnWidth = (statusId, width) => {
            const column = $el.find(`.squish-status-${statusId}`);

            if (width < minWidth) {
                width = minWidth;
            }

            column.css('max-width', width);
            return width;
        };

        const recalculateStatusColumnWidth = statusId => {
            const isStatusFolded = !!$scope.statusesFolded[statusId];
            let initialWidth = 0;

            if (isStatusFolded) {
                initialWidth = avatarWidth;
            } else {
                initialWidth = maxColumnWidth;

                if (Number($scope.ctrl.zoomLevel) === 0) {
                    initialWidth = zoom0ColumnWidth;
                }
            }

            //unassigned ceil
            const folded = !!$scope.statusesFolded[statusId];
            let statusFoldedWidth = getCeilWidth(null, statusId);

            if (statusFoldedWidth < initialWidth) {
                statusFoldedWidth = initialWidth;
            }

            _.forEach($scope.userstories, function(us) {
                const isUSFolded = !!$scope.usFolded[us.id];
                const width = getCeilWidth(us.id, statusId);

                if (width > statusFoldedWidth) { return statusFoldedWidth = width; }
            });

            return setStatusColumnWidth(statusId, statusFoldedWidth);
        };

        return recalculateTaskboardWidth = () => {
            const total = _.reduce($scope.taskStatusList, (acc, status) => acc + recalculateStatusColumnWidth(status.id) + 5
            , 0);

            $el.find('.taskboard-table-inner').css("width", maxColumnWidth + total);
            if (!firstLoad) {
                requestAnimationFrame(() => $el.addClass('animations'));
            }

            firstLoad = true;

        };
    };

    return {link};
};

module.directive("tgTaskboardSquishColumn", ["$tgResources", TaskboardSquishColumnDirective]);
