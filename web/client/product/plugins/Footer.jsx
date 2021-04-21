/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Row, Col } from 'react-bootstrap';
import src from "./attribution/geosolutions-brand.png";

/**
 * Footer plugin, section of the homepage.
 * descripition of footer can be overrided by
 * `home.footerDescription` message id in the translations
 * @prop {object} cfg.logo logo data to change image and href, set to null to hide the logo
 * @prop {object} cfg.logo.src source of the logo
 * @prop {object} cfg.logo.width width of the logo image
 * @prop {object} cfg.logo.height height of the logo image
 * @prop {object} cfg.logo.title title of the logo image
 * @prop {object} cfg.logo.alt alternative text of the logo image
 * @memberof plugins
 * @class
 */

const images = {
    governo01: require('../assets/img/logos-governo-01.svg'),
    governo02: require('../assets/img/logos-governo-02.svg'),
    governo03: require('../assets/img/logos-governo-03.svg'),
    governo04: require('../assets/img/logos-governo-04.svg')
};

class Footer extends React.Component {

    static propTypes = {
        logo: PropTypes.object
    };

    static defaultProps = {
        logo: {
            src,
            width: 140,
            height: 'auto',
            href: 'https://visualizador.idea.azores.gov.pt/',
            title: 'IDEA',
            alt: 'IDEA'
        }
    };

    render() {
        return (
            <Grid style={{position: "fixed", width: "100%", backgroundColor: "rgb(51, 102, 153)"}}>
                <Row>
                    <Col xs={4} />
                    <Col xs={1} className="text-center">
                        <img width={180} height={40} alt="180x40" src={images.governo01}/>
                    </Col>
                    <Col xs={1} className="text-center">
                        <img width={180} height={40} alt="180x40" src={images.governo02}/>
                    </Col>
                    <Col xs={1} className="text-center">
                        <img width={180} height={40} alt="180x40" src={images.governo03}/>
                    </Col>
                    <Col xs={1} className="text-center">
                        <img width={180} height={40} alt="180x40" src={images.governo04}/>
                    </Col>
                    <Col xs={4} />
                </Row>
                <hl/>
                <Row>
                    <Col xs={4} />
                    <Col xs={4}>
                        <Row>
                            <Col xs={4} className="text-center"><div className="footer-creds" style={{ color: "white", fontWeight: "bold" }}>© 2020 Direção Regional do Ambiente</div></Col>
                            <Col xs={4} className="text-center"><a className="footer-link" style={{ color: "white", fontWeight: "bold" }} href="https://idea.azores.gov.pt/termos-condicoes" target="_blank">Termos e Condições de Uso</a></Col>
                            <Col xs={4} className="text-center"><a className="footer-link" style={{ color: "white", fontWeight: "bold" }} href="https://idea.azores.gov.pt/politica-privacidade" target="_blank">Política de Privacidade</a></Col>
                        </Row>
                    </Col>
                    <Col xs={4} />
                </Row>
            </Grid>
        );
    }
}

export const FooterPlugin = Footer;
