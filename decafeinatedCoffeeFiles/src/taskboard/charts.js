/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
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
import angular from "angular";
import _ from "lodash";
import moment from "moment";

const { timeout } = this.taiga;

const module = angular.module("taigaTaskboard");

//############################################################################
//# Sprint burndown chart directive
//############################################################################

const SprintChartDirective = function($translate){
    const redrawChart = function(element, dataToDraw) {
        // This value was used statically before, feel free to update as needed.
        const elementHeight = 240;
        element.height(elementHeight);

        const days = _.map(dataToDraw, x => moment.utc(x.day));

        const data = [];
        data.unshift({
            data: _.zip(days, _.map(dataToDraw, d => d.open_points)),
            lines: {
                fillColor : "rgba(147,196,0,0.2)"
            }
        });
        data.unshift({
            data: _.zip(days, _.map(dataToDraw, d => d.optimal_points)),
            lines: {
                fillColor : "rgba(200,201,196,0.2)"
            }
        });

        const options = {
            grid: {
                borderWidth: { top: 0, right: 1, left:0, bottom: 0 },
                borderColor: "#D8DEE9",
                color: "#D8DEE9",
                hoverable: true,
                margin: { top: 0, right: 30, left: 5, bottom: 5 }
            },
            xaxis: {
                tickSize: [1, "day"],
                min: days[0],
                max: _.last(days),
                mode: "time",
                daysNames: days,
                axisLabel: $translate.instant("TASKBOARD.CHARTS.XAXIS_LABEL"),
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
                axisLabelPadding: 5
            },
            yaxis: {
                min: 0,
                axisLabel: $translate.instant("TASKBOARD.CHARTS.YAXIS_LABEL"),
                axisLabelUseCanvas: true,
                axisLabelFontSizePixels: 12,
                axisLabelFontFamily: 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
                axisLabelPadding: 5
            },
            series: {
                shadowSize: 0,
                lines: {
                    show: true,
                    fill: true
                },
                points: {
                    show: true,
                    fill: true,
                    radius: 4,
                    lineWidth: 2
                }
            },
            colors: [
                "rgba(216,222,233,1)",
                "rgba(168,228,64,1)"
            ],
            tooltip: true,
            tooltipOpts: {
                content(label, xval, yval, flotItem) {
                    const formattedDate = moment(xval).format($translate.instant("TASKBOARD.CHARTS.DATE"));
                    const roundedValue = Math.round(yval * 10) / 10;

                    if (flotItem.seriesIndex === 1) {
                        return $translate.instant("TASKBOARD.CHARTS.REAL", {
                            formattedDate,
                            roundedValue
                        });

                    } else {
                        return $translate.instant("TASKBOARD.CHARTS.OPTIMAL", {
                            formattedDate,
                            roundedValue
                        });
                    }
                }
            }
        };

        element.empty();
        return element.plot(data, options).data("plot");
    };

    const link = function($scope, $el) {
        const element = angular.element($el);

        $scope.$on("resize", function() {
            if ($scope.stats) { return redrawChart(element, $scope.stats.days); }
        });

        $scope.$on("taskboard:graph:toggle-visibility", function() {
            $el.parent().toggleClass('open');

            // fix chart overflow
            return timeout(100, function() {
                if ($scope.stats) { return redrawChart(element, $scope.stats.days); }
            });
        });

        $scope.$watch('stats', function() {
            if (($scope.stats == null)) {
                return;
            }
            return redrawChart(element, $scope.stats.days);
        });

        return $scope.$on("$destroy", () => $el.off());
    };

    return {link};
};

module.directive("tgSprintChart", ["$translate", SprintChartDirective]);
