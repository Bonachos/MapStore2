/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
const React = require('react');
const PropTypes = require('prop-types');
const ContainerDimensions = require('react-container-dimensions').default;
const ArchiveCard = require('../components/ArchiveCard');
const Filter = require('../components/misc/Filter');
// const IdeAService = require('../../node_modules/ide_a_service/src');
const axios = require('axios');

class AdminArchivePlugin extends React.Component {

    static propTypes = {
        cards: PropTypes.array,
        singleEntity: PropTypes.bool
    };

    static defaultProps = {
        cards: [
            {
                title: 'Entidades',
                desc: 'Gestão das Entidades',
                link: '#/admin/entities',
                absolute: true,
                src: 'folder-open'
            },
            {
                title: 'Visualizadores',
                desc: 'Gestão dos Visualizadores',
                link: '#/admin/viewers', // link: 'admin/viewers',
                absolute: true,
                src: '1-map'
            },
            {
                title: 'Serviços de Visualização (WMS)',
                desc: 'Gestão dos Serviços de Visualização (WMS)',
                link: '#/admin/services',
                absolute: true,
                src: 'globe'
            },
            {
                title: 'Dados Locais',
                desc: 'Gestão de Dados Locais em Formato Vetorial',
                link: '#/admin/geodata',
                absolute: true,
                src: 'file'
            },
            {
                title: 'Utilizadores',
                desc: 'Gestão de Utilizadores',
                link: '#/manager/groupmanager',
                absolute: true,
                src: 'user'
            }
        ]
    };

    state = {
        filterText: ''
    };

    componentDidMount() {
        let arrayOfYourFiles = [{
            uri: "/dist/web/client/product/assets/img/geoservers.png", // your file path string
            name: 'geoservers.png',
            type: 'image/png'
        }, {
            uri: "/dist/web/client/product/assets/img/geoservers.png", // your file path string
            name: 'geoservers.png',
            type: 'image/png'
        }];
        // create formData object
        const formData = new FormData();
        arrayOfYourFiles.forEach(file => {
            formData.append("files", file);
        });

        axios({
            method: "POST",
            url: process.env.REACT_APP_BO_URL + "/bo/geodata",
            data: formData,
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });


        // TODO
        // let apiClient = new IdeAService.ApiClient();
        // apiClient.basePath = "http://localhost:8080";
        // let apiInstance = new IdeAService.ViewerApi(apiClient);
        // apiInstance.viewerList((error, data, response) => {
        //     if (error) {
        //         console.error(error);
        //     } else {
        //         console.log('API called successfully. Returned data: ' + data);
        //     }
        // });
    }

    getCardSide = (width) => {
        const margin = 10;
        const count = width > 300 ? Math.floor(width / 300) : 1;
        return Math.floor((width - margin * (count + 1)) / count);
    }

    render() {
        let cards = this.props.cards
            .filter(c => c.title.toLowerCase().match(this.state.filterText.toLowerCase()) || c.desc.toLowerCase().match(this.state.filterText.toLowerCase()));

        if (this.props.singleEntity) {
            cards = cards.filter(card => card.title !== "Entidades");
        }
        return (
            <div className="mapstore-body">
                <div className="mapstore-archive-container">
                    <div className="mapstore-archive">
                        <ContainerDimensions>
                            {({ width }) =>
                                <span>
                                    {cards.map((m, i) => <ArchiveCard
                                        key={'map' + i}
                                        id={'map-card-' + i}
                                        title={m.title}
                                        desc={m.desc}
                                        src={m.src}
                                        link={m.link}
                                        absolute={m.absolute}
                                        side={this.getCardSide(width)} />)}
                                </span>
                            }
                        </ContainerDimensions>
                    </div>
                </div>
            </div>
        );
    }
}

module.exports = {
    AdminArchivePlugin
};
