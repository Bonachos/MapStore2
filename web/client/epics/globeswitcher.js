/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
const {TOGGLE_3D, updateLast2dMapType} = require('../actions/globeswitcher');
const {MAP_TYPE_CHANGED} = require('../actions/maptype');
const { mapTypeSelector } = require('../selectors/maptype');
const {LOCAL_CONFIG_LOADED} = require('../actions/localConfig');

const Rx = require('rxjs');
const {get} = require('lodash');

const defaultRegexes = [/\/visualizador\/\w+\/(\w+)/, /\/visualizador\/(\w+)/];
const defaultRegexes2 = [/\/gra\/\w+\/\w+\/(\w+)/];
const { push } = require('connected-react-router');

const replaceMapType = (path, newMapType) => {
    let pathToMatch = path;
    if (pathToMatch.indexOf("cesium") === -1 && pathToMatch.indexOf("openlayers") === -1) {
        pathToMatch += "/openlayers";
    }

    const match = defaultRegexes.reduce((previous, regex) => {
        return previous || pathToMatch.match(regex);
    }, null);
    if (match) {
        return `${match[0]}`.replace(`${match[1]}`, `${newMapType}`);
    }

    const match2 = defaultRegexes2.reduce((previous, regex) => {
        return previous || pathToMatch.match(regex);
    }, null);
    if (match2) {
        return `${match2[0]}`.replace(`${match2[1]}`, `${newMapType}`);
    }

    if (pathToMatch === "#/") {
        return `/viewer/cesium/config`;
    }
    return pathToMatch;
};
/**
 * Gets every `TOGGLE_3D` event.
 * @memberof epics.globeswitcher
 * @param {external:Observable} action$ manages `TOGGLE_3D`.
 * @return {external:Observable} emitting connected-react-router push action and {@link #actions.globeswitcher.updateLast2dMapType} actions
 */
const updateRouteOn3dSwitch = (action$, store) =>
    action$.ofType(TOGGLE_3D)
        .switchMap( (action) => {
            const newPath = replaceMapType(action.hash || location.hash, action.enable ? "cesium" : get(store.getState(), "globeswitcher.last2dMapType") || 'leaflet');
            if (newPath) {
                return Rx.Observable.from([push(newPath)]);
            }
            return Rx.Observable.empty();
        });
const updateLast2dMapTypeOnChangeEvents = (action$, store) => action$
    .ofType(LOCAL_CONFIG_LOADED).map(() => mapTypeSelector(store.getState()))
    .merge(action$.ofType(MAP_TYPE_CHANGED, TOGGLE_3D).pluck('mapType').filter((mapType) => mapType && mapType !== "cesium"))
    .switchMap(type => Rx.Observable.of(updateLast2dMapType(type)));
/**
 * Epics for 3d switcher functionality
 * @name epics.globeswitcher
 * @type {Object}
 */
module.exports = {
    updateRouteOn3dSwitch,
    updateLast2dMapTypeOnChangeEvents
};
