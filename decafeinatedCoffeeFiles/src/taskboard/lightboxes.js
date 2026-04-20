/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
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
import angular from "angular";
import _ from "lodash";
import debounce from "lodash/debounce";
import { logger } from "../utils/logger";
import { toast } from "./src/utils/toast";

const module = angular.module("taigaTaskboard");


const CreateBulkTasksDirective = function(TaskCreationData) {
    const link = function($scope, $el) {
        $scope.form = {data: "", usId: null};

        const submit = debounce(2000, event => {
            event.preventDefault();

            const form = $el.find("form").checksley();
            if (!form.validate()) {
                return;
            }

            const currentLoading = TaskCreationData.loading.showLoading()
                .target(submitButton)
                .start();

            const { data, sprintId, usId } = $scope.form;
            const projectId = $scope.projectId;

            const promise = TaskCreationData.resources.bulkCreate(projectId, sprintId, usId, data);
            promise.then(function(result) {
                result =  _.map(result, x => TaskCreationData.model.make_model('tasks', x));
                currentLoading.finish();
                TaskCreationData.rootscope.$broadcast("taskform:bulk:success", result);
                return TaskCreationData.lightboxService.close($el);
            });

            return promise.then(result => result, err => {
                // Handle error case, keep the lightbox open
                // for the user to fix the input and try again
                currentLoading.finish();
                logger.fatal("Error creating tasks", err);
                toast("Error creating tasks");

                return Promise.reject(err);
            });
        });

        $scope.$on("taskform:bulk", function(ctx, sprintId, usId){
            TaskCreationData.lightboxService.open($el);
            return $scope.form = {data: "", sprintId, usId};
    });

        var submitButton = $el.find(".submit-button");

        $el.on("submit", "form", submit);

        return $scope.$on("$destroy", () => $el.off());
    };

    return {link};
};

module.directive("tgLbCreateBulkTasks", [
    "TaskCreationData",
    CreateBulkTasksDirective
]);