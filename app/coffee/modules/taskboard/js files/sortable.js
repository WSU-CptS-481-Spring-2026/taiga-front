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
    mixOf
} = this.taiga;
const {
    toggleText
} = this.taiga;
const {
    scopeDefer
} = this.taiga;
const {
    bindOnce
} = this.taiga;
const {
    groupBy
} = this.taiga;

const module = angular.module("taigaBacklog");


//############################################################################
//# Sortable Directive
//############################################################################

const TaskboardSortableDirective = function($repo, $rs, $rootscope, $translate) {
    const link = function($scope, $el, $attrs) {
        let unwatch;
        return unwatch = $scope.$watch("usTasks", function(usTasks) {
            if (!usTasks || !usTasks.size) { return; }

            unwatch();

            if (!($scope.project.my_permissions.indexOf("modify_task") > -1)) {
                return;
            }

            let oldParentScope = null;
            let newParentScope = null;
            let itemEl = null;
            const tdom = $el;

            const filterError = function() {
                const text = $translate.instant("BACKLOG.SORTABLE_FILTER_ERROR");
                return $tgConfirm.notify("error", text);
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

                    // wait animation end
                    setTimeout(() => tableBody.removeClass('moving')
                    , 1000);

                    return $rootscope.$broadcast("taskboard:task:move", itemTask, itemTask.getIn(['model', 'status']), newUsId, newStatusId, itemIndex);
                });
            });


            const scroll = autoScroll([$('.taskboard-table-body')[0]], {
                margin: 100,
                pixels: 30,
                scrollWhenOutside: true,
                autoScroll() {
                    return this.down && drake.dragging;
                }
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
