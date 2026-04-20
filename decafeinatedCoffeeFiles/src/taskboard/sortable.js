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
import { logger } from "../utils/logger";
import { toast } from "./src/utils/toast";
import _ from 'lodash';
import dragula from 'dragula';
import 'dragula/dist/dragula.css';
import $ from 'jquery';

const module = angular.module("taigaBacklog");


//############################################################################
//# Sortable Directive
//############################################################################

const TaskboardSortableDirective = function($repo, $rs, $rootscope, $translate) {
    const link = function($scope, $el) {
        let unwatch;

        if (!$scope.usTasks?.size()) {
            logger.warn("User story tasks undefined or empty.");
            toast("No tasks found for this user story.");
            return;
        }
        return unwatch = $scope.$watch("usTasks", function() {

            unwatch();

            if (!$scope.project.my_permissions.includes("modify_task")) {
                logger.warn("Permission denied: user cannot modify tasks");
                toast("Not allowed to move tasks");
                return;
            }

            let oldParentScope = null;
            let newParentScope = null;
            let itemEl = null;

            const filterError = function() {
                const text = $translate.instant("BACKLOG.SORTABLE_FILTER_ERROR");
                logger.fatal(text);
                toast("Unexpected error occurred while moving the task. Please try again.");
                return;
            };

            const deleteElement = function(itemEl) {
                itemEl.off();
                return itemEl.remove();
            };

            const containers = _.map($el.find('.taskboard-column'), item => item);
            const drake = dragula(containers, {
                copySortSource: false,
                copy: false,
                accepts(el, target) { return !$(target).hasClass('taskboard-row-title-box'); },
                moves(item) {
                    return $(item).is('tg-card');
                }
            });

            let initialContainer = null;

            drake.on('shadow', item => $(item).removeClass('folded-dragging'));

            drake.on('over', function(item, container) {
                if (!initialContainer) {
                    return initialContainer = container;
                } else if (container !== initialContainer) {
                    return $(container).addClass('target-drop');
                }
            });

            drake.on('out', function(item, container) {
                if (container !== initialContainer) {
                    return $(container).removeClass('target-drop');
                }
            });

            drake.on('drag', function(item) {
                oldParentScope = $(item).parent().scope();

                if ($(item).width() === 30) {
                    $(item).addClass('folded-dragging');
                }

                if ($el.hasClass("active-filters")) {
                    filterError();
                    // Ran in browser so it shouldn't be a problem
                    // eslint-disable-next-line no-undef
                    setTimeout((() => drake.cancel(true)), 0);

                    return false;
                }
            });

            drake.on('dragend', function(item) {
                const parentEl = $(item).parent();
                itemEl = $(item);
                const itemTask = $scope.taskMap.get(Number(item.dataset.id));
                const itemIndex = itemEl.index();
                newParentScope = parentEl.scope();

                const oldUsId = oldParentScope.us ? oldParentScope.us.id : null;
                const oldStatusId = oldParentScope.st.id;
                const newUsId = newParentScope.us ? newParentScope.us.id : null;
                const newStatusId = newParentScope.st.id;

                if (initialContainer !== parentEl) {
                    $(parentEl).addClass('new');

                    $(parentEl).one('animationend', () => $(parentEl).removeClass('new'));
                }

                if ((newStatusId !== oldStatusId) || (newUsId !== oldUsId)) {
                    deleteElement(itemEl);
                }

                return $scope.$apply(function() {
                    // prevent fold/unfold animation
                    const tableBody = $('.taskboard-table-body');

                    tableBody.addClass('moving');

                    // wait animation end (ran in browser so set timeout should work fine)
                    // eslint-disable-next-line no-undef
                    setTimeout(() => tableBody.removeClass('moving')
                    , 1000);

                    return $rootscope.$broadcast("taskboard:task:move", itemTask, itemTask.getIn(['model', 'status']), newUsId, newStatusId, itemIndex);
                });
            });

            return $scope.$on("$destroy", function() {
                $el.off();
                return drake.destroy();
            });
        });
    };

    return {link};
};


module.directive("tgTaskboardSortable", [
    "$tgRepo",
    "$tgResources",
    "$rootScope",
    "$translate",
    TaskboardSortableDirective
]);
