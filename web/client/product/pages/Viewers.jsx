/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');

const ConfigUtils = require('../../utils/ConfigUtils');
const Page = require('../../containers/Page');

require('../assets/css/viewers.css');

class Viewers extends React.Component {
    static propTypes = {
        name: PropTypes.string,
        mode: PropTypes.string,
        match: PropTypes.object,
        plugins: PropTypes.object
    };

    static defaultProps = {
        name: 'viewers',
        mode: 'desktop'
    };

    render() {
        const plugins = ConfigUtils.getConfigProp('plugins') || {};
        let pagePlugins = {
            desktop: plugins.common || [],
            mobile: plugins.common || []
        };
        const pluginsConfig = {
            desktop: plugins[this.props.name] || [],
            mobile: plugins[this.props.name] || []
        };

        pagePlugins.desktop = pagePlugins.desktop.filter(pagePlugin => pagePlugin !== "NavMenu");
        
        return (
            <Page
                id="viewers"
                className="viewers"
                pagePluginsConfig={pagePlugins}
                pluginsConfig={pluginsConfig}
                plugins={this.props.plugins}
                params={this.props.match.params}/>);
    }
}

module.exports = Viewers;
