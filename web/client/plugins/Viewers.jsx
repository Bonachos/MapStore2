/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const PropTypes = require('prop-types');
const BorderLayout = require('../components/layout/BorderLayout');
const { head, isEqual, isNil, isNumber } = require('lodash');
const Toolbar = require('../components/misc/toolbar/Toolbar');
// const emptyState = require('../../old_ms2_226bfec4/web/client/components/misc/enhancers/emptyState');
const Portal = require('../components/misc/Portal');
const ResizableModal = require('../components/misc/ResizableModal');
const ReactDataGrid = require('react-data-grid');
const { Row: RowGrid } = ReactDataGrid;
const { Row, Col, Grid, NavItem, Nav, FormControl, FormGroup, Tooltip } = require('react-bootstrap');
const ContainerDimensions = require('react-container-dimensions').default;
require('react-quill/dist/quill.snow.css');
const { connect } = require('react-redux');
const { setOption } = require('../actions/mockups');
require('codemirror/mode/sql/sql');
const SwitchPanel = require('../components/misc/switch/SwitchPanel');
const createHistory = require('history/createHashHistory').default;
const history = createHistory();
const axios = require('axios');
// const SecurityUtils = require('../utils/SecurityUtils');
// TODO
// axios.defaults.headers.common['X-CSRF-TOKEN'] = SecurityUtils.getToken();

const ModalWindow = require('../components/misc/ResizableModal');
// const Message = require('../components/I18N/Message');
const Dialog = require('../components/misc/Dialog');
const OverlayTrigger = require('../components/misc/OverlayTrigger');

const {
    Draggable,
    Data
} = require('react-data-grid-addons');

const { Container: DraggableContainer, RowActionsCell, DropTargetRowContainer } = Draggable;
const { Selectors } = Data;

class RowComponent extends React.Component {
    static propTypes = {
        idx: PropTypes.string.isRequired,
        row: PropTypes.object,
        selected: PropTypes.array,
        setOption: PropTypes.func
    };

    render() {
        return (<div key={this.props.row.id}><RowGrid ref={node => { this.row = node; }} {...this.props} /></div>);
    }
}

const RowComponentRenderer = connect((state) => ({
    selected: state.mockups && state.mockups.selectedRowViewers || []
}), {
    setOption
})(RowComponent);

/* eslint-disable new-cap */
const RowRenderer = DropTargetRowContainer(RowComponentRenderer);

class DraggableGrid extends React.Component {
    static propTypes = {
        rowKey: PropTypes.string.isRequired,
        width: PropTypes.number,
        height: PropTypes.number,
        rows: PropTypes.array,
        columns: PropTypes.array,
        onSort: PropTypes.func,
        onSelect: PropTypes.func,
        selectedIds: PropTypes.array
    };

    static defaultProps = {
        rowKey: 'id',
        rows: [],
        columns: [],
        onSort: () => { },
        onSelect: () => { },
        selectedIds: []
    };

    state = {
        selectedIds: []
    }

    componentDidMount() {
        // this.grid.onToggleFilter();
    }

    onRowsSelected = (rows) => {
        const selectedIds = this.state.selectedIds.concat(rows.map(r => r.row[this.props.rowKey]));
        this.setState({ selectedIds });
        this.props.onSelect(selectedIds);
    };

    onRowsDeselected = (rows) => {
        let rowIds = rows.map(r => r.row[this.props.rowKey]);
        const selectedIds = this.state.selectedIds.filter(i => rowIds.indexOf(i) === -1);
        this.setState({ selectedIds });
        this.props.onSelect(selectedIds);
    };

    render() {
        return (
            <div>
                <div className="mapstore-body">
                    <div className="modal-margin-top">
                        <ModalWindow
                            ref="deleteMapModal"
                            show={this.props.rows.length === 0}
                            showClose={false}
                            onClose={this.close}
                            title={"Não existem Visualizadores"}
                            disableModalMode>
                            <div className="ms-detail-body">
                                Crie o seu primeiro visualizador utilizando o botão
                                <Toolbar buttons={[{
                                    className: "filter-buttons no-border",
                                    glyph: "glyphicon glyphicon-plus"
                                }]} />
                                no menu lateral
                            </div>
                        </ModalWindow>
                    </div>
                    <DraggableContainer>
                        <ReactDataGrid
                            ref={(grid) => { this.grid = grid; }}
                            enableCellSelection
                            enableRowSelect={'single'}
                            rowActionsCell={RowActionsCell}
                            columns={this.props.columns}
                            rowGetter={this.rowGetter}
                            rowsCount={this.props.rows.length}
                            minHeight={this.props.height}
                            minWidth={this.props.width}
                            rowRenderer={<RowRenderer onRowDrop={this.reorderRows} />}
                            onAddFilter={() => { }}
                            getValidFilterValues={() => { }}
                            onClearFilters={() => { }}
                            rowSelection={{
                                showCheckbox: true,
                                enableShiftSelect: true,
                                onRowsSelected: this.onRowsSelected,
                                onRowsDeselected: this.onRowsDeselected,
                                selectBy: {
                                    keys: { rowKey: this.props.rowKey, values: this.state.selectedIds }
                                }
                            }} />
                    </DraggableContainer>
                </div>
            </div>
        );
    }

    rowGetter = (i) => {
        return this.props.rows[i];
    };

    isDraggedRowSelected = (selectedRows, rowDragSource) => {
        if (selectedRows && selectedRows.length > 0) {
            let key = this.props.rowKey;
            return selectedRows.filter(r => r[key] === rowDragSource.data[key]).length > 0;
        }
        return false;
    };

    reorderRows = (e) => {
        let selectedRows = Selectors.getSelectedRowsByKey({ rowKey: this.props.rowKey, selectedKeys: this.state.selectedIds, rows: this.props.rows });
        let draggedRows = this.isDraggedRowSelected(selectedRows, e.rowSource) ? selectedRows : [e.rowSource.data];
        let undraggedRows = this.props.rows.filter((r) => {
            return draggedRows.indexOf(r) === -1;
        });
        let args = [e.rowTarget.idx, 0].concat(draggedRows);
        Array.prototype.splice.apply(undraggedRows, args);
        this.props.onSort(undraggedRows);
    };
}

class Viewers extends React.Component {

    static propTypes = {
        auth: PropTypes.any,
        buttons: PropTypes.array,
        transitionProps: PropTypes.object,
        readOnly: PropTypes.bool,
        position: PropTypes.string,
        selectedRow: PropTypes.array,
        selectedRowViewers: PropTypes.array,
        setOption: PropTypes.func,
        entity: PropTypes.string,
        singleEntity: PropTypes.bool,
        chooseZoomLevel: PropTypes.bool
    };

    static defaultProps = {
        buttons: [],
        readOnly: false,
        transitionProps: {
            transitionName: "dashboard-panel-transition",
            transitionEnterTimeout: 300,
            transitionLeaveTimeout: 300
        },
        position: 'left'
    };

    state = {
        hasLogin: false,
        currentViewer: {
            name: '',
            url: '',
            anonymous: false,
            inactive: false
        },
        activeKey: "1",
        _columns: [
            { key: 'name', name: 'Nome', filterable: true },
            { key: 'folder', name: 'Sufixo', filterable: true },
            { key: 'entityname', name: 'Entidade', filterable: true }
        ],
        _rows: [],
        errorTitle: '',
        errorMessage: ''
    };

    componentDidMount() {
        // console.log(this.props.auth);

        if (this.props.singleEntity) {
            this.state._columns = this.state._columns.filter(column => column.name !== "Entidade");
            this.updateButton(this.props, this.state);
        } else {
            this.boGetEntities();
        }

        this.boGet();
    }

    componentWillUpdate(newProps, newState) {
        if (!this.state.hasLogin && this.props.auth.user) {
            this.boGet();
        } else {
            if (this.state.selectedRowViewers !== newState.selectedRowViewers
                || this.state.createViewer !== newState.createViewer
                || this.state.showGrid !== newState.showGrid) {
                this.updateButton(newProps, newState);
            }
        }

        if (!isEqual(newState.currentViewer, this.state.currentViewer)) {
            this.setState({
                isValid: this.checkValidity(newState.currentViewer) === ''
            });
        }
    }

    onAdd() {
        this.setState({
            createViewer: true,
            currentViewer: {
                anonymous: true,
                name: '',
                folder: '',
                url: '',
                projection: 'EPSG:3857',
                xminextent: '',
                xmaxextent: '',
                yminextent: '',
                ymaxextent: '',
                extent: '',
                mapheader: '',
                mapnorth: '',
                defaultStyle: {},
                entity: this.state._entities ? this.state._entities[0].name : "default"
            },
            initialViewer: {
                anonymous: true,
                name: '',
                folder: '',
                url: '',
                projection: 'EPSG:3857',
                xminextent: '',
                xmaxextent: '',
                yminextent: '',
                ymaxextent: '',
                extent: '',
                mapheader: '',
                mapnorth: '',
                defaultStyle: {},
                entity: this.state._entities ? this.state._entities[0].name : "default"
            },
            editState: 'create'
        });
    }

    onEdit() {
        const currentItem = head(this.state._rows.filter(row => isNumber(this.state.selectedRowViewers[0]) && row.id === this.state.selectedRowViewers[0]));
        if (currentItem) {
            let self = this;
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/viewer/" + currentItem.id + "?view=default")
                .then(response => {

                    let viewer = response.data;
                    response.data.extent = Object.keys(self.extents).find(key =>
                        self.extents[key].srs === viewer.projection &&
                        self.extents[key].coords[0] === viewer.xminextent &&
                        self.extents[key].coords[1] === viewer.xmaxextent &&
                        self.extents[key].coords[2] === viewer.yminextent &&
                        self.extents[key].coords[3] === viewer.ymaxextent);

                    this.setState({
                        createViewer: true,
                        editState: 'edit',
                        currentViewer: response.data,
                        initialViewer: { ...response.data }
                    });
                })
                .catch(error => console.log(error));
        }
    }

    onEditDetails() {
        const viewerID = this.state.selectedRowViewers[0];
        const currentViewer = head(this.state._rows.filter(row => isNumber(viewerID) && row.id === viewerID));
        if (currentViewer) {
            history.push('/admin/viewerlayers/' + currentViewer.id);
        }
    }

    onOpen(viewerID, fullAddress) {
        const currentViewer = head(this.state._rows.filter(row => isNumber(viewerID) && row.id === viewerID));
        if (currentViewer) {
            if (fullAddress) {
                window.open('/#/gra/' + currentViewer.entity + '/' + currentViewer.folder, '_blank');
            } else {
                window.open('/#/visualizador/' + currentViewer.id, '_blank');
            }
        }
    }

    renderLeftColumn() {
        return !this.props.position.match('center') ? (
            <div key="ms-v-bar" className="ms-vertical-toolbar ms-sm" style={{ order: this.props.position.match('left') ? -1 : 1 }}>
                <Toolbar
                    btnGroupProps={{ vertical: true }}
                    btnDefaultProps={{
                        className: 'square-button-md',
                        bsStyle: 'primary',
                        tooltipPosition: this.props.position.match('left') ? 'right' : 'left'
                    }}
                    buttons={this.state.buttons}
                />
            </div>
        ) : null;
    }

    renderEdit(itemToRender) {
        let rowData = [
            {
                label: 'Nome',
                valueField: 'name',
                enabled: true,
                placeholder: 'O nome do visualizador',
                tooltip: 'O nome do visualizador',
                required: true
            }, {
                label: 'Sufixo',
                valueField: 'folder',
                enabled: true,
                placeholder: 'Sufixo do URL',
                tooltip: 'Sufixo do URL',
                required: true
            }, {
                label: 'Entidade',
                valueField: 'entity',
                enabled: true,
                required: true,
                selectOptions: this.state._entities
            }, {
            // TODO
            //     label: 'Endereço',
            //     valueField: 'url',
            //     enabled: true,
            //     placeholder: 'O endereço (URL) do visualizador',
            //     required: false
            // }, {
                label: 'Imagem (Thumbnail)',
                valueField: 'image',
                enabled: true,
                placeholder: 'Endereço (URL) para a imagem (thumbnail) do visualizador',
                tooltip: 'Endereço (URL) para a imagem (thumbnail) do visualizador',
                required: false
            }, {
                label: 'CRS do Centro',
                valueField: 'centercrs',
                enabled: true,
                required: false,
                selectOptions: [
                    {name: "EPSG:3857", label: "EPSG:3857"},
                    {name: "EPSG:4326", label: "EPSG:4326"},
                    {name: "EPSG:5013", label: "EPSG:5013"},
                    {name: "EPSG:5014", label: "EPSG:5014"},
                    {name: "EPSG:5015", label: "EPSG:5015"}
                ]
            }, {
                label: 'X do Centro',
                valueField: 'centerx',
                enabled: true,
                placeholder: '-28.193665',
                tooltip: 'Coordenada X do Centro',
                required: false
            }, {
                label: 'Y do Centro',
                valueField: 'centery',
                enabled: true,
                placeholder: '38.676933',
                tooltip: 'Coordenada Y do Centro',
                required: false
            }, {
                label: 'Extensão do visualizador',
                valueField: 'extent',
                enabled: true,
                required: false,
                selectOptions: [
                    {name: "Outra", label: "Outra"},
                    {name: "EPSG_5013_RAA", label: "Região Autónoma dos Açores (EPSG:5013)"},
                    {name: "EPSG_3857_GOcidental", label: "Grupo Ocidental (EPSG:3857)"},
                    {name: "EPSG_4326_GOcidental", label: "Grupo Ocidental (EPSG:4326)"},
                    {name: "EPSG_5014_GOcidental", label: "Grupo Ocidental (EPSG:5014)"},
                    {name: "EPSG_3857_GCentral", label: "Grupo Central (EPSG:3857)"},
                    {name: "EPSG_4326_GCentral", label: "Grupo Central (EPSG:4326)"},
                    {name: "EPSG_5015_GCentral", label: "Grupo Central (EPSG:5015)"},
                    {name: "EPSG_3857_GOriental", label: "Grupo Oriental (EPSG:3857)"},
                    {name: "EPSG_4326_GOriental", label: "Grupo Oriental (EPSG:4326)"},
                    {name: "EPSG_5015_GOriental", label: "Grupo Oriental (EPSG:5015)"},
                    {name: "EPSG_3857_Corvo", label: "Corvo (EPSG:3857)"},
                    {name: "EPSG_4326_Corvo", label: "Corvo (EPSG:4326)"},
                    {name: "EPSG_5014_Corvo", label: "Corvo (EPSG:5014)"},
                    {name: "EPSG_3857_Graciosa", label: "Graciosa (EPSG:3857)"},
                    {name: "EPSG_4326_Graciosa", label: "Graciosa (EPSG:4326)"},
                    {name: "EPSG_5015_Graciosa", label: "Graciosa (EPSG:5015)"},
                    {name: "EPSG_3857_Faial", label: "Faial (EPSG:3857)"},
                    {name: "EPSG_4326_Faial", label: "Faial (EPSG:4326)"},
                    {name: "EPSG_5015_Faial", label: "Faial (EPSG:5015)"},
                    {name: "EPSG_3857_Flores", label: "Flores (EPSG:3857)"},
                    {name: "EPSG_4326_Flores", label: "Flores (EPSG:4326)"},
                    {name: "EPSG_5014_Flores", label: "Flores (EPSG:5014)"},
                    {name: "EPSG_3857_Pico", label: "Pico (EPSG:3857)"},
                    {name: "EPSG_4326_Pico", label: "Pico (EPSG:4326)"},
                    {name: "EPSG_5015_Pico", label: "Pico (EPSG:5015)"},
                    {name: "EPSG_3857_SantaMaria", label: "Santa Maria (EPSG:3857)"},
                    {name: "EPSG_4326_SantaMaria", label: "Santa Maria (EPSG:4326)"},
                    {name: "EPSG_5015_SantaMaria", label: "Santa Maria (EPSG:5015)"},
                    {name: "EPSG_3857_SaoJorge", label: "São Jorge (EPSG:3857)"},
                    {name: "EPSG_4326_SaoJorge", label: "São Jorge (EPSG:4326)"},
                    {name: "EPSG_5015_SaoJorge", label: "São Jorge (EPSG:5015)"},
                    {name: "EPSG_3857_SaoMiguel", label: "São Miguel (EPSG:3857)"},
                    {name: "EPSG_4326_SaoMiguel", label: "São Miguel (EPSG:4326)"},
                    {name: "EPSG_5015_SaoMiguel", label: "São Miguel (EPSG:5015)"},
                    {name: "EPSG_3857_Terceira", label: "Terceira (EPSG:3857)"},
                    {name: "EPSG_4326_Terceira", label: "Terceira (EPSG:4326)"},
                    {name: "EPSG_5015_Terceira", label: "Terceira (EPSG:5015)"}
                ]
            }, {
                label: 'Projeção do visualizador',
                valueField: 'projection',
                enabled: true,
                required: false,
                selectOptions: [
                    {name: "EPSG:3857", label: "EPSG:3857"},
                    {name: "EPSG:4326", label: "EPSG:4326"},
                    {name: "EPSG:5013", label: "EPSG:5013"},
                    {name: "EPSG:5014", label: "EPSG:5014"},
                    {name: "EPSG:5015", label: "EPSG:5015"}
                ]
            }, {
                label: 'Nível de Zoom',
                valueField: 'zoom',
                enabled: true,
                placeholder: '1',
                tooltip: 'Nível de Zoom',
                required: false,
                selectOptions: [
                    {name: "0", label: "1:20000000"},
                    {name: "1", label: "1:15000000"},
                    {name: "2", label: "1:10000000"},
                    {name: "3", label: "1:7500000"},
                    {name: "4", label: "1:5000000"},
                    {name: "5", label: "1:2500000"},
                    {name: "6", label: "1:1000000"},
                    {name: "7", label: "1:500000"},
                    {name: "8", label: "1:250000"},
                    {name: "9", label: "1:100000"},
                    {name: "10", label: "1:25000"},
                    {name: "11", label: "1:10000"},
                    {name: "12", label: "1:5000"},
                    {name: "13", label: "1:2500"},
                    {name: "14", label: "1:1000"},
                    {name: "15", label: "1:500"}
                ]
            }, {
                label: 'X Mínimo',
                valueField: 'xminextent',
                enabled: true,
                placeholder: '-31.12972061137288',
                tooltip: 'X Mínimo',
                required: false
            }, {
                label: 'X Máximo',
                valueField: 'xmaxextent',
                enabled: true,
                placeholder: '-31.081590117941197',
                tooltip: 'X Máximo',
                required: false
            }, {
                label: 'Y Mínimo',
                valueField: 'yminextent',
                enabled: true,
                placeholder: '39.66872113303264',
                tooltip: 'Y Mínimo',
                required: false
            }, {
                label: 'Y Máximo',
                valueField: 'ymaxextent',
                enabled: true,
                placeholder: '39.726511657336125',
                tooltip: 'Y Máximo',
                required: false
            }, {
                label: 'Endereço Email - Notificações',
                valueField: 'emailaddress',
                enabled: true,
                tooltip: 'Endereço Email - Notificações',
                required: false
            }
        ];
        if (this.props.singleEntity) {
            rowData = rowData.filter(row => row.label !== "Entidade");
        }
        if (!this.props.chooseZoomLevel) {
            rowData = rowData.filter(row => row.label !== "Nível de Zoom");
            rowData = rowData.filter(row => row.label !== "CRS do Centro");
            rowData = rowData.filter(row => row.label !== "X do Centro");
            rowData = rowData.filter(row => row.label !== "Y do Centro");
        } else {
            rowData = rowData.filter(row => row.label !== "X Mínimo");
            rowData = rowData.filter(row => row.label !== "X Máximo");
            rowData = rowData.filter(row => row.label !== "Y Mínimo");
            rowData = rowData.filter(row => row.label !== "Y Máximo");
        }

        const onChange = (key, value) => {
            if (key === 'entity') {
                let entityname = this.state._entities.find(e => { return e.name === value; }).label;
                this.setState({
                    currentViewer: { ...this.state.currentViewer, [key]: value, entityname: entityname }
                });
            } else if (key === 'extent' && value !== "Outra") {
                this.setState({
                    currentViewer: {
                        ...this.state.currentViewer,
                        [key]: value,
                        "projection": this.extents[value].srs,
                        "xminextent": this.extents[value].coords[0],
                        "xmaxextent": this.extents[value].coords[1],
                        "yminextent": this.extents[value].coords[2],
                        "ymaxextent": this.extents[value].coords[3]
                    }
                });
            } else if (key === 'projection' || key === 'xminextent' || key === 'xmaxextent' || key === 'yminextent' || key === 'ymaxextent' ) {
                this.setState({
                    currentViewer: {
                        ...this.state.currentViewer,
                        [key]: value,
                        "extent": "Outra"
                    }
                });
            } else {
                this.setState({
                    currentViewer: { ...this.state.currentViewer, [key]: value }
                });
            }
        };

        return (
            <Grid className="ms-rule-editor" fluid style={{ width: '100%' }}>
                {
                    rowData.map(d => {
                        return (
                            <Row className={d.enabled ? '' : 'ms-disabled'}>
                                <Col xs={12} sm={6}>
                                    {d.label}:
                                </Col>
                                <Col xs={12} sm={6}>
                                    {<FormGroup>
                                        {d.selectOptions
                                            ?
                                            <FormControl
                                                onChange={e => {
                                                    onChange(d.valueField, e.target.value);
                                                }}
                                                value={itemToRender && itemToRender[d.valueField]}
                                                componentClass="select">
                                                {this.renderSelectOptions(d.selectOptions)}
                                            </FormControl>
                                            :
                                            <OverlayTrigger placement={"top"} overlay={(<Tooltip id={"tooltip-layer-group"}>{d.tooltip}</Tooltip>)}>
                                                <FormControl
                                                    disabled={!d.enabled}
                                                    value={itemToRender && itemToRender[d.valueField]}
                                                    placeholder={d.placeholder || ''}
                                                    type="text"
                                                    onChange={e => {
                                                        onChange(d.valueField, e.target.value);
                                                    }}
                                                />
                                            </OverlayTrigger>
                                        }
                                    </FormGroup>}
                                </Col>
                            </Row>
                        );
                    })
                }
            </Grid>
        );
    }

    renderSelectOptions = (options) => {
        return options.map((format) => <option value={format.name} key={format.name}>{format.label}</option>);
    };

    renderSecondary(currentViewer) {
        return (
            <Grid className="ms-rule-editor" fluid style={{ width: '100%' }}>
                <SwitchPanel
                    title="Público (Ativa acesso anónimo)"
                    expanded={currentViewer.anonymous}
                    onSwitch={(checked) => this.setState({ currentViewer: { ...this.state.currentViewer, anonymous: checked }})}
                />
                <SwitchPanel
                    title="Inativo (Coloca o visualizador 'Em manutenção')"
                    expanded={currentViewer.inactive}
                    onSwitch={(checked) => this.setState({ currentViewer: { ...this.state.currentViewer, inactive: checked }})}
                />
            </Grid>
        );
    }

    renderPrint(itemToRender) {
        let rowData = [
            {
                label: 'Imagem de Cabeçalho',
                valueField: 'mapheader',
                enabled: true,
                placeholder: 'Endereço para Imagem',
                required: true
            },
            {
                label: 'Imagem SVG do Norte',
                valueField: 'mapnorth',
                enabled: true,
                placeholder: 'Endereço para SVG',
                required: true
            }
        ];

        const onChange = (key, value) => {
            this.setState({
                currentViewer: { ...this.state.currentViewer, [key]: value }
            });
        };
        return (
            <Grid className="ms-rule-editor" fluid style={{ width: '100%' }}>
                {
                    rowData.map(d => {
                        return (
                            <Row className={d.enabled ? '' : 'ms-disabled'}>
                                <Col xs={12} sm={6}>
                                    {d.label}:
                                </Col>
                                <Col xs={12} sm={6}>
                                    {<FormGroup>
                                        {d.selectOptions
                                            ?
                                            <FormControl
                                                onChange={e => {
                                                    onChange(d.valueField, e.target.value);
                                                }}
                                                value={itemToRender && itemToRender[d.valueField] || d.placeholder}
                                                componentClass="select">
                                                {this.renderSelectOptions(d.selectOptions)}
                                            </FormControl>
                                            :
                                            <FormControl
                                                disabled={!d.enabled}
                                                value={itemToRender && itemToRender[d.valueField] || d.placeholder}
                                                placeholder={d.placeholder || ''}
                                                type="text"
                                                onChange={e => {
                                                    onChange(d.valueField, e.target.value);
                                                }}
                                            />
                                        }
                                    </FormGroup>}
                                </Col>
                            </Row>
                        );
                    })
                }
            </Grid>
        );
    }

    renderPanelTab() {
        switch (this.state.activeKey) {
        case "1":
            return this.renderEdit(this.state.currentViewer);
        case "2":
            return this.renderSecondary(this.state.currentViewer);
        case "3":
            return this.renderPrint(this.state.currentViewer);
        default:
            return null;
        }
    }

    renderPanelBody() {
        const buttons = [{
            glyph: '1-close',
            tooltip: 'Fechar sem gravar',
            visible: this.state.createViewer,
            onClick: () => {
                if (isEqual(this.state.initialViewer, this.state.currentViewer)) {
                    this.setState({
                        activeKey: "1",
                        createViewer: false,
                        regionOI: false,
                        initialViewer: {}
                    });
                } else {
                    this.setState({
                        showNotComplete: true
                    });
                }
            }
        }, {
            glyph: 'floppy-disk',
            tooltip: 'Gravar',
            visible: this.state.createViewer,
            onClick: () => {
                const checkValidityResult = this.checkValidity(this.state.currentViewer);
                if (checkValidityResult === '') {
                    if (this.state.editState === 'create') {
                        this.boAdd(this.state.currentViewer, this);
                    } else if (this.state.editState === 'edit') {
                        this.boEdit(this.state.currentViewer, this);
                    } else {
                        this.setState({
                            activeKey: "1",
                            createViewer: false,
                            regionOI: false,
                            _rows: [...this.state._rows.filter(row => row.id !== this.state.currentViewer.id), { ...this.state.currentViewer }]
                        });
                    }
                } else {
                    this.setState({
                        showIncompleteModal: true,
                        checkValidityResult
                    });
                }
            }
        }];
        return (
            <BorderLayout header={<div className="ms-panel-header-container">
                <div className="ms-toolbar-container">
                    <Toolbar btnDefaultProps={{ className: 'square-button-md', bsStyle: 'primary', tooltipPosition: 'bottom' }} buttons={buttons} />
                </div>
                <Nav
                    bsStyle="tabs"
                    activeKey={this.state.activeKey || "1"}
                    justified
                    onSelect={activeKey => {
                        if (activeKey !== this.state.activeKey) {
                            this.setState({
                                activeKey,
                                regionOI: false
                            });
                        } else {
                            this.setState({
                                activeKey
                            });
                        }
                    }}>
                    <NavItem eventKey="1">Geral</NavItem>
                    <NavItem eventKey="2">Secundários</NavItem>
                    <NavItem eventKey="3">Impressão</NavItem>
                </Nav>
            </div>}>
                {this.renderPanelTab()}
            </BorderLayout>
        );
    }

    renderPanel() {
        return !this.props.position.match('center') ? (
            <div style={{ order: this.props.position.match('left') ? -1 : 1, display: this.state.createViewer ? 'block' : 'none' }} className="ms-rules-side">
                {this.renderPanelBody()}
            </div>
        ) : null;
    }

    renderError = () => {
        return (<Dialog modal draggable={false} backgroundStyle={''} style={{display: this.state.errorMessage ? "block" : "none"}}>
            <span role="header">
                {this.state.errorTitle}
            </span>
            <div role="body">
                {this.state.errorMessage}
            </div>
        </Dialog>);
    };

    render() {
        return (
            <div className="mapstore-body">
                <div className="modal-margin-top">
                    <ModalWindow
                        ref="deleteMapModal"
                        show={!this.props.auth.user}
                        showClose={false}
                        onClose={this.close}
                        title={"Não possui permissões para gerir Visualizadores."}
                        disableModalMode>
                        <div className="ms-detail-body">
                            Faça Login com uma conta que possua permissões de administração.
                        </div>
                    </ModalWindow>
                </div>
                {this.props.auth.user &&
                    <BorderLayout
                        header={this.props.position.match('center') ? <div className="">
                            <Toolbar btnDefaultProps={{
                                className: 'square-button-md',
                                bsStyle: 'primary',
                                tooltipPosition: 'bottom'
                            }}
                            buttons={this.props.buttons} />
                        </div> : null}
                        columns={this.props.position.match('left') ? [this.renderLeftColumn(), this.renderPanel()] : [this.renderPanel(), this.renderLeftColumn()]}>
                        <ContainerDimensions>
                            {({ width, height }) =>
                                <DraggableGrid
                                    onSort={rows => {
                                        this.setState({
                                            _rows: [...rows]
                                        });
                                    }}
                                    onSelect={(selected) => {
                                        this.setState({
                                            selectedRowViewers: [...selected]
                                        });
                                    }}
                                    columns={this.state._columns}
                                    rows={this.state._rows}
                                    width={width}
                                    height={height}
                                />
                            }
                        </ContainerDimensions>
                    </BorderLayout>
                }
                {this.props.position.match('center') &&
                    <Portal>
                        <ResizableModal
                            title="Create New Viewer"
                            show={this.state.createViewer}
                            onClose={() => {
                                this.setState({
                                    createViewer: false
                                });
                            }}
                            buttons={[
                                {
                                    text: 'Close',
                                    bsStyle: 'primary',
                                    onClick: () => {
                                        this.setState({
                                            createViewer: false
                                        });
                                    }
                                },
                                {
                                    text: 'Save',
                                    bsStyle: 'primary',
                                    onClick: () => {
                                        this.setState({
                                            createViewer: false
                                        });
                                    }
                                }
                            ]}>
                            {this.renderPanelBody()}
                        </ResizableModal>
                    </Portal>
                }

                <Portal>
                    <ResizableModal
                        title={this.state.checkValidityResult}
                        size="xs"
                        show={this.state.showIncompleteModal}
                        onClose={() => {
                            this.setState({
                                showIncompleteModal: false
                            });
                        }}
                        buttons={[
                            {
                                text: 'Ok',
                                bsStyle: 'primary',
                                onClick: () => {
                                    this.setState({
                                        showIncompleteModal: false
                                    });
                                }
                            }
                        ]}>
                        <div className="ms-alert">
                            <div className="ms-alert-center">
                                O formulário deverá ser preenchido completamente antes de guardar.
                            </div>
                        </div>
                    </ResizableModal>
                </Portal>

                <Portal>
                    <ResizableModal
                        title="Guardar alterações"
                        size="xs"
                        show={this.state.showNotComplete}
                        onClose={() => {
                            this.setState({
                                showNotComplete: false
                            });
                        }}
                        buttons={[
                            {
                                text: 'Não',
                                bsStyle: 'primary',
                                onClick: () => {
                                    this.setState({
                                        showNotComplete: false
                                    });
                                }
                            },
                            {
                                text: 'Sim',
                                bsStyle: 'primary',
                                onClick: () => {
                                    this.setState({
                                        showNotComplete: false,
                                        activeKey: "1",
                                        createViewer: false,
                                        regionOI: false,
                                        initialViewer: {}
                                    });
                                }
                            }
                        ]}>
                        <div className="ms-alert">
                            <div className="ms-alert-center">
                                Tem a certeza que deseja fechar sem guardar as suas alterações?
                            </div>
                        </div>

                    </ResizableModal>
                </Portal>

                <div className="mapstore-footer">
                    {this.renderError()}
                </div>
            </div>
        );
    }

    boGetEntities() {
        if (this.props.auth.user) {
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/entity", {
                    headers: {
                        'Authorization': `Bearer ` + this.props.auth.token
                    }
                })
                .then(response => {
                    const newState = Object.assign({}, this.state, {
                        _entities: response.data.map(c => {
                            return {
                                name: c.folder,
                                label: c.name
                            };
                        })
                    });

                    this.updateButton(this.props, newState);
                })
                .catch(error => console.log(error));
        }
    }

    extents = {
        "EPSG_5013_RAA": { srs: "EPSG:5013", coords: ["-34.05706966444731", "-22.123461390650675", "32.70883003578407", "43.836247925779595"]},
        "EPSG_3857_GOcidental": { srs: "EPSG:3857", coords: ["-3480828.56", "-3460051.00", "4774966.42", "4826231.50"]},
        "EPSG_4326_GOcidental": { srs: "EPSG:4326", coords: ["-31.3624080474804", "-30.978293626285094", "39.262107940911676", "39.83241328340351"]},
        "EPSG_5014_GOcidental": { srs: "EPSG:5014", coords: ["648958.95", "664407.07", "4359138.61", "4399393.73"]},
        "EPSG_3857_GCentral": { srs: "EPSG:3857", coords: ["-3209874.92", "-3010213.17", "4633541.12", "4735607.23"]},
        "EPSG_4326_GCentral": { srs: "EPSG:4326", coords: ["-28.834797", "-27.041205", "38.382071", "39.097221"]},
        "EPSG_5015_GCentral": { srs: "EPSG:5015", coords: ["311737.0636897231", "521987.97791944543", "4132512.31988844", "4444677.687894854"]},
        "EPSG_3857_GOriental": { srs: "EPSG:3857", coords: ["-2919842.4652796187", "-2713521.5108484947", "4330137.316070446", "4636467.763685315"]},
        "EPSG_4326_GOriental": { srs: "EPSG:4326", coords: ["-25.854823", "-25.013179", "36.927630", "37.910640"]},
        "EPSG_5015_GOriental": { srs: "EPSG:5015", coords: ["600751.24", "676899.85", "4087434.14", "4197890.64"]},
        "EPSG_3857_Corvo": { srs: "EPSG:3857", coords: ["-3470617.6708783023", "-3454679.170862044", "4810278.305378264", "4833942.638735736"]},
        "EPSG_4326_Corvo": { srs: "EPSG:4326", coords: ["-31.169708894670286", "-31.041291105329712", "39.6023672719238c39.7930327280762"]},
        "EPSG_5014_Corvo": { srs: "EPSG:5014", coords: ["658431.8749959355", "666401.1250040645", "4389998.916660632", "4401831.083339368"]},
        "EPSG_3857_Graciosa": { srs: "EPSG:3857", coords: ["-3134033.2223361414", "-3102156.222303627", "4705577.554154263", "4752906.220869205"]},
        "EPSG_4326_Graciosa": { srs: "EPSG:4326", coords: ["-28.13700633786376", "-27.883393662136235", "38.86462711058209", "39.24117288941791"]},
        "EPSG_5015_Graciosa": { srs: "EPSG:5015", coords: ["404612.74999187136", "420551.25000812864", "4311292.833321265", "4334957.166678735"]},
        "EPSG_3857_Faial": { srs: "EPSG:3857", coords: ["-3209874.81", "-3183526.93", "4652458.87", "4670818.56"]},
        "EPSG_4326_Faial": { srs: "EPSG:4326", coords: ["-28.834796", "-28.598109", "38.515163", "38.644094"]},
        "EPSG_5015_Faial": { srs: "EPSG:5015", coords: ["339936.38", "361074.77", "4264230.27", "4278673.22"]},
        "EPSG_3857_Flores": { srs: "EPSG:3857", coords: ["-3480828.56", "-3464744.79", "4774966.42", "4797101.80"]},
        "EPSG_4326_Flores": { srs: "EPSG:4326", coords: ["-31.268815", "-31.124332", "39.371084", "39.524633"]},
        "EPSG_5014_Flores": { srs: "EPSG:5014", coords: ["648957.47", "661364.40", "4359202.43", "4376778.03"]},
        "EPSG_3857_Pico": { srs: "EPSG:3857", coords: ["-3180606.7024224577", "-3116852.702357429", "4599001.056938804", "4693658.390368686"]},
        "EPSG_4326_Pico": { srs: "EPSG:4326", coords: ["-28.59272583932972", "-27.965913124813707", "37.995682161468196", "38.92632839630073"]},
        "EPSG_5015_Pico": { srs: "EPSG:5015", coords: ["365199.16", "410462.56", "4248941.02", "4269058.00"]},
        "EPSG_3857_SantaMaria": { srs: "EPSG:3857", coords: ["-2809949.3426577654", "-2778072.342625251", "4411726.803751478", "4459055.47046642"]},
        "EPSG_4326_SantaMaria": { srs: "EPSG:4326", coords: ["-25.221274075964498", "-24.977525924035508", "36.79165017672204", "37.15354982327796"]},
        "EPSG_5015_SantaMaria": { srs: "EPSG:5015", coords: ["653265.9999837427", "685143.0000162573", "4069940.666642529", "4117269.333357471"]},
        "EPSG_3857_SaoJorge": { srs: "EPSG:3857", coords: ["-3156701.895241145", "-3084978.645167988", "4617758.613537045", "4724248.1136456635"]},
        "EPSG_4326_SaoJorge": { srs: "EPSG:4326", coords: ["-28.34956979919333", "-27.720530200806667", "38.17807372443805", "39.112026275561945"]},
        "EPSG_5015_SaoJorge": { srs: "EPSG:5015", coords: ["379960.9583027241", "435745.70835962455", "4223424.083277707", "4306249.250028855"]},
        "EPSG_3857_SaoMiguel": { srs: "EPSG:3857", coords: ["-2901785.0581584596", "-2774277.0580284013", "4457324.5514535075", "4646639.2183132"]},
        "EPSG_4326_SaoMiguel": { srs: "EPSG:4326", coords: ["-25.989723375644886", "-24.99927662435512", "37.07197810893628", "38.542521891063714"]},
        "EPSG_5015_SaoMiguel": { srs: "EPSG:5015", coords: ["592646.7499593569", "672339.2500406431", "4126189.166606323", "4244510.833393677"]},
        "EPSG_3857_Terceira": { srs: "EPSG:3857", coords: ["-3054433.863724456", "-3003676.197006017", "4658146.239036687", "4705474.905751629"]},
        "EPSG_4326_Terceira": { srs: "EPSG:4326", coords: ["-27.379453", "-27.041206", "38.638986", "38.803431"]},
        "EPSG_5015_Terceira": { srs: "EPSG:5015", coords: ["466949.23", "496424.84", "4276740.27", "4294995.02"]}
    };

    boGet() {
        let selectedEntity = this.props.entity;
        if (this.props.singleEntity) {
            selectedEntity = "default";
        }

        if (this.props.auth.user) {
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/viewer", {
                    headers: {
                        'Authorization': `Bearer ` + this.props.auth.token
                    }
                })
                .then(response => {
                    if (selectedEntity) {
                        response.data = response.data.filter(v => v.entity.toLowerCase() === selectedEntity.toLowerCase());
                    }

                    const newState = Object.assign({}, this.state, {
                        _rows: response.data,
                        hasLogin: true
                    });

                    this.updateButton(this.props, newState);
                })
                .catch(error => console.log(error));
        }
    }

    boAdd(itemToAdd) {
        if (this.props.singleEntity) {
            itemToAdd.entity = "default";
        }
        if (!this.props.chooseZoomLevel) {
            itemToAdd.zoom = "";
            itemToAdd.centercrs = "";
            itemToAdd.centerx = "";
            itemToAdd.centery = "";
        } else {
            itemToAdd.xminextent = "";
            itemToAdd.xmaxextent = "";
            itemToAdd.yminextent = "";
            itemToAdd.ymaxextent = "";
        }
        axios
            .post(process.env.REACT_APP_BO_URL + "/bo/viewer", { "viewer": itemToAdd }, {
                headers: {
                    'Authorization': `Bearer ` + this.props.auth.token
                }
            })
            .then(response => {
                // const newViewers = response.data.map(c => {
                //     return {
                //         id: c.id,
                //         name: c.name,
                //         url: c.url
                //     };
                // });

                // const newState = Object.assign({}, this.state, {
                //     _rows: newViewers
                // });

                // this.setState(newState);

                this.setState({
                    activeKey: "1",
                    createViewer: false,
                    regionOI: false,
                    _rows: [{ ...this.state.currentViewer, id: Number(response.data), grab: 0 }, ...this.state._rows]
                }, () => this.setError('Visualizador adicionado com sucesso', 'Visualizador adicionado com sucesso'));
            })
            .catch(error => {
                console.log(error);
                this.setError('Erro ao adicionar Visualizador', 'Erro ao adicionar Visualizador');
            });
    }

    boEdit(itemToEdit) {
        if (!this.props.chooseZoomLevel) {
            itemToEdit.zoom = "";
            itemToEdit.centercrs = "";
            itemToEdit.centerx = "";
            itemToEdit.centery = "";
        } else {
            itemToEdit.xminextent = "";
            itemToEdit.xmaxextent = "";
            itemToEdit.yminextent = "";
            itemToEdit.ymaxextent = "";
        }
        axios
            .put(process.env.REACT_APP_BO_URL + "/bo/viewer/" + itemToEdit.id, { viewer: itemToEdit })
            .then(() => {
                this.componentDidMount();
                this.setState({
                    activeKey: "1",
                    createViewer: false,
                    regionOI: false
                }, () => this.setError('Visualizador editado com sucesso', 'Visualizador editado com sucesso'));
            })
            .catch(error => {
                console.log(error);
                this.setError('Erro ao editar Visualizador', 'Erro ao editar Visualizador');
            });
    }

    boRemove(itemToRemoveID) {
        axios
            .delete(process.env.REACT_APP_BO_URL + "/bo/viewer/" + itemToRemoveID)
            .then(location.reload())
            .catch(error => {
                console.log(error);
                this.setError('Erro ao remover Visualizador', 'Erro ao remover Visualizador');
            });
    }

    checkValidity(itemToCheck) {
        if (isNil(itemToCheck.name) || itemToCheck.name === '') {
            return 'Por favor preencha o campo Nome';
        }
        if (isNil(itemToCheck.folder) || itemToCheck.folder === '') {
            return 'Por favor preencha o campo Sufixo';
        }
        if (this.state._rows.find(row => row.entity === itemToCheck.entity && row.folder === itemToCheck.folder && row.id !== itemToCheck.id)) {
            return 'Já existe um visualizador com o mesmo Sufixo';
        }

        // TODO folder não pode ter espaço nem caracteres que não possam constar do URL

        return '';
    }

    setError(errorTitle, errorMessage) {
        this.setState({
            errorMessage: errorMessage,
            errorTitle: errorTitle
        }, () => setTimeout(() => this.setState({
            errorTitle: '',
            errorMessage: ''
        }), 2000));
    }

    updateButton(props, state) {
        const selectedRow = state.selectedRowViewers || [];

        this.setState({
            ...state,
            buttons: [{
                glyph: '1-map',
                tooltip: 'Abrir o Visualizador por endereço completo',
                visible: (state.selectedRowViewers || []).length === 1 && !state.createViewer,
                onClick: () => {
                    const rowItemID = state.selectedRowViewers[0];
                    this.onOpen(rowItemID, true);
                }
            }, {
                glyph: '1-map',
                tooltip: 'Abrir o Visualizador por Identificador',
                visible: (state.selectedRowViewers || []).length === 1 && !state.createViewer,
                onClick: () => {
                    const rowItemID = state.selectedRowViewers[0];
                    this.onOpen(rowItemID, false);
                }
            }, {
                glyph: 'plus',
                tooltip: 'Adicionar um visualizador',
                visible: props.auth.user && !state.createViewer && (state.selectedRowViewers || []).length === 0,
                onClick: () => {
                    this.onAdd();
                }
            }, {
                glyph: 'pencil',
                tooltip: 'Editar o visualizador selecionado',
                visible: props.auth.user && (state.selectedRowViewers || []).length === 1 && !state.createViewer,
                onClick: () => {
                    this.onEdit();
                }
            }, {
                glyph: 'list',
                tooltip: 'Editar as camadas do visualizador selecionado',
                visible: (state.selectedRowViewers || []).length === 1 && !state.createViewer,
                onClick: () => {
                    this.onEditDetails();
                }
            }, {
                glyph: 'trash',
                tooltip: 'Remover o visualizador selecionado',
                visible: props.auth.user && selectedRow.length > 0 && !state.createViewer,
                onClick: () => {
                    let rows = this.state._rows;
                    this.state.selectedRowViewers.forEach(selectedRowID => {
                        this.boRemove(selectedRowID);
                        rows = rows.filter(row => row.id !== selectedRowID);
                    });
                    this.setState({
                        selectedRow: [],
                        _rows: rows,
                        selectedRowViewers: null
                    });
                }
            }]
        });
    }
}

const ViewersPlugin = connect((state) => ({
    auth: state.security,
    selectedRow: state.mockups && state.mockups.selectedRowViewers || []
}), {
    setOption
})(Viewers);

module.exports = {
    ViewersPlugin
};
