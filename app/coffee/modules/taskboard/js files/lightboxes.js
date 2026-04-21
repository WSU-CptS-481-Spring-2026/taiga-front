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

const {
    taiga
} = this;
const {
    bindOnce
} = this.taiga;
const {
    debounce
} = this.taiga;
const {
    trim
} = this.taiga;


const module = angular.module("taigaTaskboard");


const CreateBulkTasksDirective = function($repo, $rs, $rootscope, $loading, lightboxService, $model) {
    const link = function($scope, $el, attrs) {
        $scope.form = {data: "", usId: null};

        const submit = debounce(2000, event => {
            event.preventDefault();

            const form = $el.find("form").checksley();
            if (!form.validate()) {
                return;
            }

            const currentLoading = $loading()
                .target(submitButton)
                .start();

            const {
                data
            } = $scope.form;
            const {
                projectId
            } = $scope;
            const {
                sprintId
            } = $scope.form;
            const {
                usId
            } = $scope.form;

            const promise = $rs.tasks.bulkCreate(projectId, sprintId, usId, data);
            promise.then(function(result) {
                result =  _.map(result, x => $model.make_model('tasks', x));
                currentLoading.finish();
                $rootscope.$broadcast("taskform:bulk:success", result);
                return lightboxService.close($el);
            });

            // TODO: error handling
            return promise.then(null, () => currentLoading.finish());
        });

        $scope.$on("taskform:bulk", function(ctx, sprintId, usId){
            lightboxService.open($el);
            return $scope.form = {data: "", sprintId, usId};
    });

        var submitButton = $el.find(".submit-button");

        $el.on("submit", "form", submit);

        return $scope.$on("$destroy", () => $el.off());
    };

    return {link};
};

module.directive("tgLbCreateBulkTasks", [
    "$tgRepo",
    "$tgResources",
    "$rootScope",
    "$tgLoading",
    "lightboxService",
    "$tgModel",
    CreateBulkTasksDirective
]);
