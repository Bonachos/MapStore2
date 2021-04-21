/*
 * Copyright 2016, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
const React = require('react');
const PropTypes = require('prop-types');
const src = require("./attribution/geosolutions-brand-sm.png");
const assign = require('object-assign');

class Attribution extends React.Component {
    static propTypes = {
        src: PropTypes.string,
        style: PropTypes.object
    };

    static defaultProps = {
        src: src,
        style: {
            position: "absolute",
            width: "124px",
            left: 0,
            bottom: 0
        }
    };

    render() {
        return null;
    }
}

module.exports = {
    AttributionPlugin: assign(Attribution, {
        NavMenu: {
            tool: (props) => ({
                position: 0,
                label: props.label || 'IDEA',
                href: props.href || 'https://visualizador.idea.azores.gov.pt/',
                img: props.src && <img className="customer-logo" src={props.src} height="50" /> || <img className="customer-logo" src={src} height="50" />,
                logo: true
            })
        }
    })
};

