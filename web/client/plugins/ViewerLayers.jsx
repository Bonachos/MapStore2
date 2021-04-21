/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react');
const { Glyphicon, Button, Grid, Col, Row, Form, FormGroup, FormControl, ControlLabel, NavItem, Nav } = require('react-bootstrap');
const Select = require('react-select');
const BorderLayout = require('../components/layout/BorderLayout');
// const { head, isNumber } = require('lodash');
const PropTypes = require('prop-types');
const Toolbar = require('../components/misc/toolbar/Toolbar');
const ContainerDimensions = require('react-container-dimensions').default;
const {
    // Draggable,
    Data
} = require('react-data-grid-addons');
// const { Container: DraggableContainer, RowActionsCell, DropTargetRowContainer: dropTargetRowContainer } = Draggable;
const ReactDataGrid = require('react-data-grid');
const { connect } = require('react-redux');
const { setOption } = require('../actions/mockups');
const SwitchPanel = require('../components/misc/switch/SwitchPanel');
const createHistory = require('history/createHashHistory').default;
const history = createHistory();
const axios = require('axios');
// const MockAdapter = require('axios-mock-adapter');
const Message = require('../components/I18N/Message');
const uuidv1 = require('uuid/v1');
const ModalWindow = require('../components/misc/ResizableModal');

const SortableTree = require('react-sortable-tree').default;
require('react-sortable-tree/style.css'); // This only needs to be imported once in your app
const Dialog = require('../components/misc/Dialog');
const SwitchButton = require('../components/misc/switch/SwitchButton');

const { Row: RowGrid } = ReactDataGrid;
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

const RowRenderer = RowComponentRenderer;
const { Selectors } = Data;

const ApenasTipoFonteGeoserver = false;

class DraggableGrid extends React.Component {
    static propTypes = {
        gridName: PropTypes.string.isRequired,
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
            <ReactDataGrid
                enableCellSelection
                columns={this.props.columns}
                rowGetter={this.rowGetter}
                rowsCount={this.props.rows.length}
                minHeight={this.props.height}
                minWidth={this.props.width}
                rowRenderer={<RowRenderer />}
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
                }} />);
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

        let targetIndex = e.rowTarget.idx + 1;
        draggedRows.forEach(draggedRow => {
            draggedRow.id = targetIndex++;
            draggedRow.group = "default";
            if (e.rowSource.data.geoserverURL) {
                draggedRow.type = "wms";
            }
        });
        this.props.rows.forEach(row => {
            if (row.id >= targetIndex) {
                row.id += targetIndex;
            }
        });

        // if (this.props.gridName === "inuseLayers" && draggedRows[0].status === "available") {
        //     this.props.onSort([...this.props.rows, ...draggedRows]);
        // } else {
        let args = [e.rowTarget.idx + 1, 0].concat(draggedRows);
        Array.prototype.splice.apply(undraggedRows, args);
        this.props.onSort(undraggedRows);
        // }
    };
}

class ViewerLayers extends React.Component {

    static propTypes = {
        auth: PropTypes.any,
        position: PropTypes.string,
        buttons: PropTypes.array,
        setOption: PropTypes.func,
        viewer: PropTypes.string,
        currentViewer: PropTypes.any
    };

    static defaultProps = {
        position: 'left'
    };

    state = {
        currentViewer: {
            name: '',
            url: '',
            anonymous: false,
            inactive: false,
            basemap: false
        },
        activeKey: "1",
        _columns: [
            { key: 'layerTitle', name: 'Camada', filterable: false }
        ],
        _availableLayersColumns: [
            { key: 'layerName', name: 'Título', filterable: false },
            { key: 'layerTitle', name: 'Nome', filterable: false }
        ],
        _rows: [],
        _availableLayersRows: [],
        _availableLayersRowsUnfiltered: [],
        availableStyles: [],
        _selectedToAdd: [],
        values: {
            dataSourceType: '',
            dataSources: [],
            dataSource: '',
            selectedStyle: ''
        },
        treeData: [],
        errorTitle: '',
        errorMessage: '',
        showOnlySameSRSLayers: false
    }

    componentWillMount() {
        this.updateButton(this.props, this.state);
    }

    componentDidMount() {
        axios
            .get(process.env.REACT_APP_BO_URL + "/bo/viewer/" + this.props.viewer + "?view=default")
            .then(response => {
                const viewerWithFullDetails = {
                    id: response.data.id,
                    nome: response.data.name,
                    pasta: response.data.folder,
                    entidade: response.data.entity,
                    ['endereço']: response.data.url,
                    ['x do centro']: response.data.centerx,
                    ['y do centro']: response.data.centery,
                    ['crs do centro']: response.data.centercrs,
                    ['projeção do visualizador']: response.data.projection,
                    ['nível de zoom']: response.data.zoom,
                    anonymous: response.data.anonymous || false,
                    inactive: response.data.inactive || false
                };

                this.setState({
                    currentViewer: viewerWithFullDetails
                });
            })
            .catch(error => console.log(error));

        axios
            .get(process.env.REACT_APP_BO_URL + "/bo/viewer/" + this.props.viewer + "/layers")
            .then(viewerLayersResponse => {
                const layers = viewerLayersResponse.data.map(c => {
                    return {
                        id: c.id,
                        layerTitle: c.title,
                        layerName: c.name,
                        group: c.group,
                        format: c.format,
                        source: c.source,
                        type: c.type,
                        // geoserverName: dataSource.geoserverName,
                        // geoserverURL: dataSource.geoserverURL,
                        status: "inuse",
                        geoserverURL: c.url,
                        visibility: c.visibility,
                        style: c.style,
                        title: c.title,
                        isFolder: false,
                        catalogurl: c.catalogurl
                    };
                });

                axios
                    .get(process.env.REACT_APP_BO_URL + "/bo/viewer/" + this.props.viewer + "/groups")
                    .then(viewerGroupsResponse => {
                        let groups = viewerGroupsResponse.data.map(c => {
                            return {
                                id: c.id,
                                title: c.title,
                                isFolder: true
                            };
                        });

                        let groups0 = [];
                        let groups1 = [];
                        let groups2 = [];

                        layers.forEach(layer => {
                            let groupFound = false;
                            groups.forEach(group => {
                                if (group.id === layer.group) {
                                    group.children = group.children ? [layer, ...group.children] : [layer];
                                    groupFound = true;
                                }
                            });
                            if (!groupFound) {
                                if (layer.group === "") {
                                    groups0.push(layer);
                                } else {
                                    let groupTitle = layer.group === "background" ? "Camadas de Base" : layer.group;
                                    groups = [{ id: layer.group, title: groupTitle, isFolder: true, children: [layer] }, ...groups];
                                }
                            }
                        });

                        groups.forEach(group => {
                            const groupLevel = group.id.split(".").length - 1;
                            if (groupLevel === 0) {
                                groups0.push(group);
                            } else if (groupLevel === 1) {
                                groups1.push(group);
                            } else {
                                groups2.push(group);
                            }
                        });
                        groups2.forEach(group2 => {
                            groups1.forEach(group1 => {
                                if (group2.id.indexOf(group1.id) === 0 && group2.id[group1.id.length] === ".") {
                                    group1.children = group1.children ? [...group1.children, group2] : [group2];
                                }
                            });
                        });
                        groups1.forEach(group1 => {
                            groups0.forEach(group0 => {
                                if (group1.id.indexOf(group0.id) === 0 && group1.id[group0.id.length] === ".") {
                                    group0.children = group0.children ? [...group0.children, group1] : [group1];
                                }
                            });
                        });
                        let groupBackgroundFound = false;
                        groups0.forEach(group0 => {
                            if (group0.id === "background") {
                                groupBackgroundFound = true;
                            }
                        });
                        if (!groupBackgroundFound) {
                            let groupBackground = { id: "background", title: "Camadas de Base", expanded: false, isFolder: true };
                            groups0 = groups0 === [] ? [groupBackground] : [groupBackground, ...groups0];
                        }
                        this.setState({
                            _rows: [...groups0],
                            treeData: [...groups0]
                        });
                    })
                    .catch(error => console.log(error));

                // this.setState({
                //     _rows: [...layers],
                //     treeData: [...layers]
                // });

                // DEBUG
                // this.updateAvailableLayersList({ geoserverID: "1" });
            })
            .catch(error => console.log(error));

        if (ApenasTipoFonteGeoserver) {
            this.updateDataSourceList("geoserver");
        }
    }

    componentWillUpdate(newProps, newState) {
        if (this.state.selectedRowLayers !== newState.selectedRowLayers
            || this.state.editLayer !== newState.editLayer) {
            this.updateButton(newProps, newState);
        }
    }

    onAdd() {
        this.setState({
            treeData: this.state.treeData.concat({
                id: uuidv1(),
                title: "Novo Grupo",
                isFolder: true
            })
        });
    }

    onEditLayer(selectedRow) {
        const currentLayer = selectedRow;
        this.setState({
            editLayer: true,
            editState: 'edit',
            currentLayer: currentLayer
        });
        if (selectedRow) {
            this.setState({
                initialLayer: { ...selectedRow }
            });
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/geoserverstyle?geoserverURL=" + selectedRow.geoserverURL + "&entityid=" + this.state.currentViewer.entidade)
                .then(response => {
                    const availableStyles = response.data.map(c => {
                        return { value: c.id, label: c.name };
                    });

                    this.setState({
                        availableStyles: availableStyles,
                        values: { ...this.state.values, selectedStyle: currentLayer.style }
                    });
                })
                .catch(error => console.log(error));
        }
    }

    onRemoveLayer(layer) {
        let found = this.state.treeData.findIndex(ti => ti.id === layer.id);
        if (found >= 0) {
            this.state.treeData.splice(found, 1);
            return;
        }
        this.state.treeData.forEach(treeItem => {
            if (treeItem.children) {
                found = treeItem.children.findIndex(ti => ti.id === layer.id);
                if (found >= 0) {
                    treeItem.children.splice(found, 1);
                    return;
                }
                treeItem.children.forEach(treeItem1 => {
                    if (treeItem1.children) {
                        found = treeItem1.children.findIndex(ti => ti.id === layer.id);
                        if (found >= 0) {
                            treeItem1.children.splice(found, 1);
                            return;
                        }
                        treeItem1.children.forEach(treeItem2 => {
                            if (treeItem2.children) {
                                found = treeItem2.children.findIndex(ti => ti.id === layer.id);
                                if (found >= 0) {
                                    treeItem2.children.splice(found, 1);
                                    return;
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    onToggleSameSRSLayers() {
        const proj = this.state.currentViewer["projeção do visualizador"];
        this.setState({
            showOnlySameSRSLayers: !this.state.showOnlySameSRSLayers,
            _availableLayersRowsUnfiltered: !this.state.showOnlySameSRSLayers ? this.state._availableLayersRows : this.state._availableLayersRowsUnfiltered,
            _availableLayersRows: !this.state.showOnlySameSRSLayers ? this.state._availableLayersRows.filter(row => row.srs.indexOf(proj) >= 0) : this.state._availableLayersRowsUnfiltered
        });
    }

    getMaxTreeItemIndex(state) {
        let max = 0;
        state.treeData.forEach(treeItem => {
            if (!treeItem.isFolder) {
                max = max > treeItem.id ? max : treeItem.id;
            }
            if (treeItem.children) {
                treeItem.children.forEach(treeItem1 => {
                    if (!treeItem1.isFolder) {
                        max = max > treeItem1.id ? max : treeItem1.id;
                    }
                    if (treeItem1.children) {
                        treeItem1.children.forEach(treeItem2 => {
                            if (!treeItem2.isFolder) {
                                max = max > treeItem2.id ? max : treeItem2.id;
                            }
                            if (treeItem2.children) {
                                treeItem2.children.forEach(treeItem3 => {
                                    if (!treeItem3.isFolder) {
                                        max = max > treeItem3.id ? max : treeItem3.id;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
        return max;
    }

    renderSecondary(currentLayer) {
        return (
            <Grid className="ms-rule-editor" fluid style={{ width: '100%' }}>
                <SwitchPanel
                    title="Visível"
                    expanded={currentLayer.visibility === 'true'}
                    onSwitch={(checked) => {
                        if (checked) {
                            currentLayer.visibility = 'true';
                        } else {
                            currentLayer.visibility = 'false';
                        }
                        this.setState({
                            currentLayer: currentLayer
                        });
                    }}
                />
                {/* <SwitchPanel
                    title="Basemap"
                    expanded={currentLayer.group === 'background'}
                    onSwitch={(checked) => {
                        if (checked) {
                            currentLayer.group = 'background';
                        } else {
                            currentLayer.group = this.state.currentViewer.nome;
                        }
                        currentLayer.basemap = checked;
                        this.setState({
                            currentLayer: currentLayer
                        });
                    }}
                /> */}
            </Grid>
        );
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
                    buttons={this.state.buttons} />
            </div>
        ) : null;
    }

    renderPanel() {
        return !this.props.position.match('center') ? (
            <div style={{ order: this.props.position.match('left') ? -1 : 1, display: this.state.editLayer ? 'block' : 'none' }} className="ms-rules-side">
                {this.renderPanelBody()}
            </div>
        ) : null;
    }

    renderPanelBody() {
        const buttons = [{
            glyph: '1-close',
            tooltip: 'Fechar sem gravar',
            visible: this.state.editLayer,
            onClick: () => {
                this.setState({
                    editLayer: false,
                    activeKey: "1",
                    regionOI: false,
                    initialLayer: {},
                    step: 0
                });
            }
        }, {
            glyph: 'floppy-disk',
            tooltip: 'Guardar',
            visible: this.state.editLayer,
            onClick: () => {
                // if (this.checkValidity(this.state.currentViewer)) {
                let treeData = this.state.treeData;
                this.replaceTreeItem(this.state.currentLayer);
                if (this.state.editState === 'edit') {
                    this.setState({
                        editLayer: false,
                        activeKey: "1",
                        regionOI: false,
                        treeData: treeData,
                        step: 0
                    });
                }
                // } else {
                //     this.setState({
                //         showIncompleteModal: true
                //     });
                // }
            }
        }];
        return (
            <BorderLayout header={<div className="ms-panel-header-container">
                <div className="ms-toolbar-container">
                    <Toolbar btnDefaultProps={{ className: 'square-button-md', bsStyle: 'primary', tooltipPosition: 'bottom' }} buttons={buttons} />
                </div>
                <Nav bsStyle="tabs" activeKey={this.state.activeKey || "1"} justified
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
                    {this.state.currentLayer && this.state.currentLayer.isFolder ? null : <NavItem eventKey="2">Secundários</NavItem>}
                </Nav>
            </div>}>
                {this.renderPanelTab()}
            </BorderLayout>
        );
    }

    renderPanelTab() {
        switch (this.state.activeKey) {
        case "1":
            return this.renderEditLayer(this.state.currentLayer);
        case "2":
            return this.renderSecondary(this.state.currentLayer);
        default:
            return null;
        }
    }

    renderEditLayer(layer) {
        if (layer && layer.isFolder) {
            const rowData = [
                {
                    label: 'Nome',
                    valueField: 'title',
                    enabled: true,
                    placeholder: 'O nome do grupo'
                }
            ];

            const onChange = (key, value) => {
                this.setState({
                    currentLayer: { ...this.state.currentLayer, [key]: value }
                });
            };
            return (
                <Grid className="ms-rule-editor" fluid style={{ width: '100%' }}>
                    {
                        rowData.map(d => {
                            return (
                                <React.Fragment>
                                    <Row className={d.enabled ? '' : 'ms-disabled'}>
                                        <Col xs={8} sm={4}>
                                            {d.label}:
                                        </Col>
                                        <Col xs={16} sm={8}>
                                            {<FormGroup>
                                                <FormControl
                                                    disabled={!d.enabled}
                                                    value={layer && layer[d.valueField]}
                                                    placeholder={d.placeholder || ''}
                                                    type="text"
                                                    onChange={e => {
                                                        onChange(d.valueField, e.target.value);
                                                    }}
                                                />
                                            </FormGroup>}
                                        </Col>
                                    </Row>
                                </React.Fragment>
                            );
                        })
                    }
                </Grid>
            );
        }

        const rowData = [
            {
                label: 'Nome',
                valueField: 'layerTitle',
                enabled: true,
                placeholder: 'O nome da camada',
                showWhenLocal: true
            },
            {
                label: 'URL do Serviço',
                valueField: 'geoserverURL',
                enabled: true,
                showWhenLocal: false
            },
            {
                label: 'Nome da Camada no Serviço',
                valueField: 'layerName',
                enabled: true,
                showWhenLocal: false
            },
            {
                label: 'Identificador do Metadado',
                valueField: 'catalogurl',
                enabled: true,
                showWhenLocal: true
            },
            {
                label: 'Estilo',
                valueField: 'style',
                enabled: true,
                showWhenLocal: false
            }
        ];

        const onChange = (key, value) => {
            this.setState({
                currentLayer: { ...this.state.currentLayer, [key]: value }
            });
        };
        return (
            <Grid className="ms-rule-editor" fluid style={{ width: '100%' }}>
                {
                    rowData.map(d => {
                        return (
                            <React.Fragment>
                                { (d.showWhenLocal || layer && layer.geoserverURL) &&
                                <Row className={d.enabled ? '' : 'ms-disabled'}>
                                    <Col xs={8} sm={4}>
                                        {d.label}:
                                    </Col>
                                    <Col xs={16} sm={8}>
                                        {<FormGroup>
                                            {d.label === "Estilo" && this.state.availableStyles.length > 0
                                                ?
                                                <Select
                                                    clearable={false}
                                                    value={this.state.values.selectedStyle}
                                                    placeholder="Escolha o estilo da camada"
                                                    onChange={({ value }) => {
                                                        this.setState({ values: { ...this.state.values, selectedStyle: value } });
                                                        layer.style = value;
                                                        // this.updateDataSourceList(value);
                                                    }}
                                                    options={this.state.availableStyles}
                                                />
                                                :
                                                <FormControl
                                                    disabled={!d.enabled || layer && !layer.geoserverURL}
                                                    value={layer && layer[d.valueField]}
                                                    placeholder={d.placeholder || ''}
                                                    type="text"
                                                    onChange={e => {
                                                        onChange(d.valueField, e.target.value);
                                                    }}
                                                />
                                            }
                                        </FormGroup>}
                                    </Col>
                                </Row> }
                            </React.Fragment>
                        );
                    })
                }
            </Grid>
        );
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
            <span>
                <div className="mapstore-body">
                    <div className="modal-margin-top">
                        <ModalWindow
                            ref="deleteMapModal"
                            show={!this.props.auth.user}
                            showClose={false}
                            onClose={this.close}
                            title={"Não possui permissões para gerir as Camadas do Visualizador."}
                            disableModalMode>
                            <div className="ms-detail-body">
                                Faça Login com uma conta que possua permissões de administração.
                            </div>
                        </ModalWindow>
                    </div>
                    {this.props.auth.user &&
                        <Grid fluid>
                            <Row>
                                <Col xs={6}>
                                    <div className="ms-vertical-panel">
                                        <h2>Visualizador <b>{this.state.currentViewer.nome}</b></h2>
                                        <BorderLayout header={this.props.position.match('center') ? <div className="">
                                            <Toolbar btnDefaultProps={{ className: 'square-button-md', bsStyle: 'primary', tooltipPosition: 'bottom' }} buttons={this.props.buttons} />
                                        </div> : null} columns={this.props.position.match('left') ? [this.renderLeftColumn(), this.renderPanel()] : [this.renderPanel(), this.renderLeftColumn()]}>
                                            <ContainerDimensions>
                                                {({ height }) =>
                                                    // <DraggableGrid
                                                    //     gridName="inuseLayers"
                                                    //     onSort={rows => {
                                                    //         this.setState({
                                                    //             _rows: [...rows]
                                                    //         });
                                                    //     }}
                                                    //     onSelect={(selected) => {
                                                    //         this.setState({
                                                    //             selectedRowLayers: [...selected]
                                                    //         });
                                                    //     }}
                                                    //     columns={this.state._columns}
                                                    //     rows={this.state._rows}
                                                    //     width={width}
                                                    //     height={height} />
                                                    <div style={{ height: height * 0.75 }}>
                                                        <SortableTree
                                                            maxDepth={4}
                                                            treeData={this.state.treeData}
                                                            onChange={treeData => this.setState({ treeData })}
                                                            canNodeHaveChildren={(node) => {
                                                                return node.isFolder === true;
                                                            }}
                                                            // TODO Not working?
                                                            // canDrag={(node) => {
                                                            //     return node.title !== "Camadas de Base";
                                                            // }}

                                                            generateNodeProps={rowInfo => ({
                                                                icons: rowInfo.node.isFolder
                                                                    ? [
                                                                        <div
                                                                            style={{
                                                                                borderLeft: 'solid 8px gray',
                                                                                borderBottom: 'solid 10px gray',
                                                                                marginRight: 10,
                                                                                boxSizing: 'border-box',
                                                                                width: 16,
                                                                                height: 12,
                                                                                filter: rowInfo.node.expanded
                                                                                    ? 'drop-shadow(1px 0 0 gray) drop-shadow(0 1px 0 gray) drop-shadow(0 -1px 0 gray) drop-shadow(-1px 0 0 gray)'
                                                                                    : 'none',
                                                                                borderColor: rowInfo.node.expanded ? 'white' : 'gray'
                                                                            }}
                                                                        />
                                                                    ]
                                                                    : [
                                                                        <div
                                                                            style={{
                                                                                border: 'solid 1px black',
                                                                                fontSize: 8,
                                                                                textAlign: 'center',
                                                                                marginRight: 10,
                                                                                width: 12,
                                                                                height: 16
                                                                            }}
                                                                        >
                                                                            F
                                                                        </div>
                                                                    ],
                                                                buttons: [
                                                                    rowInfo.node.id !== "background" &&
                                                                    <div>
                                                                        <Button
                                                                            tooltip={'Editar a camada selecionada'}
                                                                            onClick={() => this.onEditLayer(rowInfo.node)}
                                                                        >
                                                                            <Glyphicon
                                                                                glyph={"pencil"}
                                                                            />
                                                                        </Button>

                                                                        <Button
                                                                            tooltip={'Remover a camada selecionada'}
                                                                            onClick={() => {
                                                                                this.onRemoveLayer(rowInfo.node);
                                                                                let treeData = [...this.state.treeData];
                                                                                this.setState({
                                                                                    treeData
                                                                                });
                                                                            }}
                                                                        >
                                                                            <Glyphicon
                                                                                glyph={"trash"}
                                                                            />
                                                                        </Button>
                                                                    </div>
                                                                ]
                                                            })}
                                                        />
                                                    </div>
                                                }
                                            </ContainerDimensions>
                                            {this.state.editLayer && !this.props.position.match('center') && <div className="ms-overlay">
                                                {this.state.editLayer && this.state.activeKey === "3" && this.state.regionOI && this.state.typeROI !== 'CQL Filter' && this.renderMap()}
                                            </div>}
                                        </BorderLayout>
                                    </div>
                                </Col>

                                <Col xs={6}>
                                    <div className="ms-vertical-panel">
                                        <h2>Adicionar camadas</h2>

                                        <FormGroup style={ApenasTipoFonteGeoserver ? { display: 'none' } : {}}>
                                            <ControlLabel>Tipo de Fonte de Dados</ControlLabel>
                                            <Select
                                                clearable={false}
                                                value={this.state.values.dataSourceType}
                                                placeholder="Escolha o tipo de fonte de dados"
                                                onChange={({ value }) => {
                                                    this.setState({ values: { ...this.state.values, dataSourceType: value } });
                                                    this.updateDataSourceList(value);
                                                }}
                                                options={[
                                                    {
                                                        value: 'geoserver',
                                                        label: 'Serviços de Visualização'
                                                    },
                                                    {
                                                        value: 'local',
                                                        label: 'Fonte Local'
                                                    }
                                                ]}
                                            />
                                        </FormGroup>

                                        <FormGroup style={ApenasTipoFonteGeoserver || this.state.values.dataSourceType ? {} : { display: 'none' }}>
                                            <ControlLabel>Fonte de dados</ControlLabel>
                                            <Select clearable={false}
                                                value={this.state.values.dataSource}
                                                placeholder="Escolha a fonte de dados"
                                                onChange={({ value }) => {
                                                    this.setState({ values: { ...this.state.values, dataSource: value } });
                                                    if (this.state.values.dataSourceType === "geoserver") {
                                                        const geoserver = this.state.values.dataSources.find((element) => {
                                                            return element.geoserverID === value;
                                                        });
                                                        this.updateAvailableLayersList(geoserver);
                                                    }
                                                }}
                                                options={this.state.values.dataSources}
                                            />
                                            {!ApenasTipoFonteGeoserver && this.state.values.dataSourceType !== "geoserver" && <div>
                                                <br />
                                                <Button
                                                    id="home-button"
                                                    bsStyle="primary"
                                                    onClick={() => this.addSelected(this.state)}
                                                >{"Adicionar dados locais"}</Button>
                                                <br />
                                                <br />
                                            </div>
                                            }
                                        </FormGroup>

                                        <FormGroup
                                            style={this.state._availableLayersRows && this.state._availableLayersRows.length > 0 && this.state.values.dataSourceType === "geoserver" ? {} : { visibility: 'hidden' }}>
                                            <ControlLabel>Camadas</ControlLabel>
                                            {this.state._selectedToAdd.length > 0 && <div>
                                                <Button
                                                    id="home-button"
                                                    bsStyle="primary"
                                                    onClick={() => this.addSelected(this.state)}
                                                >{"Adicionar camada(s) selecionada(s)"}</Button>
                                                <br />
                                                <br />
                                            </div>
                                            }
                                            <Form componentClass="fieldset">
                                                <SwitchButton
                                                    onChange={() => this.onToggleSameSRSLayers("showOnlySameSRSLayers")}
                                                    className=""
                                                    checked={this.state.showOnlySameSRSLayers}
                                                />&nbsp;
                                                <Message msgId="Mostrar apenas camadas no SRS do visualizador" />
                                            </Form>
                                            <DraggableGrid
                                                ref={(grid) => { this.grid = grid; }}
                                                gridName="availableLayers"
                                                onSort={rows => {
                                                    this.setState({
                                                        _availableLayersRows: [...rows]
                                                    });
                                                }}
                                                onSelect={(selected) => {
                                                    this.setState({
                                                        _selectedToAdd: [...selected]
                                                    });
                                                }}
                                                columns={this.state._availableLayersColumns}
                                                rows={this.state._availableLayersRows}
                                            />
                                        </FormGroup>
                                    </div>
                                </Col>
                            </Row>
                        </Grid>
                    }

                    <div className="mapstore-footer">
                        {this.renderError()}
                    </div>
                </div>
            </span>
        );
    }

    grid = {}

    replaceTreeItem(layer) {
        this.state.treeData.forEach(treeItem => {
            if (treeItem.id === layer.id) {
                if (treeItem.isFolder) {
                    treeItem.title = layer.title;
                } else {
                    treeItem.title = layer.layerTitle;
                    treeItem.layerTitle = layer.layerTitle;
                    treeItem.catalogurl = layer.catalogurl;
                }
            }
            if (treeItem.children) {
                treeItem.children.forEach(treeItem1 => {
                    if (treeItem1.id === layer.id) {
                        if (treeItem1.isFolder) {
                            treeItem1.title = layer.title;
                        } else {
                            treeItem1.title = layer.layerTitle;
                            treeItem1.layerTitle = layer.layerTitle;
                            treeItem1.catalogurl = layer.catalogurl;
                        }
                    }
                    if (treeItem1.children) {
                        treeItem1.children.forEach(treeItem2 => {
                            if (treeItem2.id === layer.id) {
                                if (treeItem2.isFolder) {
                                    treeItem2.title = layer.title;
                                } else {
                                    treeItem2.title = layer.layerTitle;
                                    treeItem2.layerTitle = layer.layerTitle;
                                    treeItem2.catalogurl = layer.catalogurl;
                                }
                            }
                            if (treeItem2.children) {
                                treeItem2.children.forEach(treeItem3 => {
                                    if (treeItem3.id === layer.id) {
                                        if (treeItem3.isFolder) {
                                            treeItem3.title = layer.title;
                                        } else {
                                            treeItem3.title = layer.layerTitle;
                                            treeItem3.layerTitle = layer.layerTitle;
                                            treeItem3.catalogurl = layer.catalogurl;
                                        }
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    addSelected(state) {
        if (this.state.values.dataSourceType === "geoserver") {
            let selectedToAdd = [];
            let targetIndex = this.getMaxTreeItemIndex(state) + 1;

            this.state._selectedToAdd.forEach(rowToAdd => {
                let rowName = rowToAdd;
                const indexOfUnderscore = rowName.indexOf('_');
                if (indexOfUnderscore > 0 && rowName.length > 2) {
                    rowName = rowName.substring(indexOfUnderscore + 1);
                }
                let copyOfRow = Object.assign({}, { id: rowName, layerTitle: rowName, title: rowName, layerName: rowName });
                copyOfRow.id = targetIndex++;
                copyOfRow.group = "default";
                copyOfRow.visibility = 'true';
                copyOfRow.geoserverURL = this.state.values.dataSources.find((dataSource) => dataSource.id === this.state.values.dataSource).geoserverURL;
                // TODO
                // if (e.rowSource.data.geoserverURL) {
                copyOfRow.type = "wms";
                copyOfRow.style = "";
                // }
                selectedToAdd.push(copyOfRow);
            });

            this.grid.state.selectedIds = [];

            this.setState({
                treeData: state.treeData.concat(selectedToAdd)
            });
        } else {
            let treeDataItem = this.state.values.dataSources[this.state.values.dataSource];
            let treeDataValue = treeDataItem.label;
            let targetIndex = this.getMaxTreeItemIndex(state) + 1;
            this.setState({
                treeData: state.treeData.concat({ type: 'vector', id: targetIndex++, layerTitle: treeDataValue, title: treeDataValue, layerName: treeDataValue, visibility: 'true', entity: treeDataItem.entity })
            });
        }
    }

    updateDataSourceList(dataSourceType) {
        if (dataSourceType === "geoserver") {

            // if (process.env.NODE_ENV !== "production") {
            //     // TODO Remove mock on production
            //     let mock = new MockAdapter(axios);
            //     mock.onGet('/bo/geoserver').reply(200, [
            //             { id: 1, name: 'Geoserver dos Açores' }
            //         ]
            //     );
            // }
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/geoserver", {
                    headers: {
                        'Authorization': `Bearer ` + this.props.auth.token
                    }
                })
                .then(response => {
                    const camadasBase = {
                        id: 12345,
                        geoserverID: 12345,
                        geoserverName: "IDE.A - Mapas de Base",
                        geoserverURL: window.location.origin + "/service",
                        label: "IDE.A - Mapas de Base",
                        value: 12345
                    };
                    const geoservers = response.data.map(c => {
                        return {
                            id: c.id,
                            geoserverID: c.id,
                            geoserverName: c.name,
                            geoserverURL: c.url,
                            label: c.name,
                            value: c.id
                        };
                    });

                    this.setState({ values: { ...this.state.values, dataSources: [ camadasBase, ...geoservers ] } });
                })
                .catch(error => console.log(error));
        } else {
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/geodata", {
                    headers: {
                        'Authorization': `Bearer ` + this.props.auth.token
                    }
                })
                .then(response => {
                    const geoservers = response.data.map(c => {
                        return {
                            id: c.id,
                            label: c.name,
                            value: c.id,
                            entity: c.entity,
                            entityname: c.entityname
                        };
                    });

                    this.setState({ values: { ...this.state.values, dataSources: geoservers } });
                })
                .catch(error => console.log(error));
        }
    }

    updateAvailableLayersList(dataSource) {
        axios
            .get(process.env.REACT_APP_BO_URL + "/bo/geoserverData/" + dataSource.geoserverID)
            .then(response => {
                const availableLayers = response.data.map(c => {
                    return {
                        id: dataSource.geoserverID + "_" + c.name,
                        layerTitle: c.title,
                        layerName: c.name,
                        geoserverName: dataSource.geoserverName,
                        geoserverURL: dataSource.geoserverURL,
                        status: "available",
                        srs: c.srs
                    };
                });

                this.setState({ _availableLayersRows: availableLayers });
            })
            .catch(error => console.log(error));
    }

    updateLayersOnServer(viewerID, treeData) {
        let layers = [];
        let groups = [];

        treeData.forEach(treeItem => {
            if (treeItem.isFolder) {
                if (treeItem.id !== "background") {
                    treeItem.id = uuidv1();
                }
                groups.push(treeItem);
            }
            if (treeItem.children) {
                treeItem.children.forEach(treeItem1 => {
                    if (treeItem1.isFolder) {
                        treeItem1.id = treeItem.id + "." + uuidv1();
                        groups.push(treeItem1);
                    }
                    if (treeItem1.children) {
                        treeItem1.children.forEach(treeItem2 => {
                            if (treeItem2.isFolder) {
                                treeItem2.id = treeItem1.id + "." + uuidv1();
                                groups.push(treeItem2);
                            }
                            if (treeItem2.children) {
                                treeItem2.children.forEach(treeItem3 => {
                                    if (treeItem3.isFolder) {
                                        treeItem3.id = treeItem2.id + "." + uuidv1();
                                        groups.push(treeItem3);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        treeData.forEach(treeItem => {
            if (!treeItem.isFolder) {
                treeItem.group = "";
                layers = [treeItem, ...layers];
            }
            if (treeItem.children) {
                treeItem.children.forEach(treeItem1 => {
                    if (!treeItem1.isFolder) {
                        treeItem1.group = treeItem.id;
                        layers = [treeItem1, ...layers];
                    }
                    if (treeItem1.children) {
                        treeItem1.children.forEach(treeItem2 => {
                            if (!treeItem2.isFolder) {
                                treeItem2.group = treeItem1.id;
                                layers = [treeItem2, ...layers];
                            }
                            if (treeItem2.children) {
                                treeItem2.children.forEach(treeItem3 => {
                                    if (!treeItem3.isFolder) {
                                        treeItem3.group = treeItem2.id;
                                        layers = [treeItem3, ...layers];
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });

        const layersPut = layers.map(c => {
            let layerPut = {
                id: c.id,
                title: c.layerTitle,
                name: c.layerName,
                url: c.geoserverURL,
                group: c.group,
                format: c.format,
                source: c.source,
                style: c.style,
                visibility: c.visibility,
                catalogurl: c.catalogurl
            };
            if (c.type) {
                layerPut.type = c.type;
                if (c.type === "vector" && c.entity) {
                    layerPut.name = c.entity + "/" + layerPut.name;
                }
            } else {
                layerPut.type = "";
            }
            return layerPut;
        });
        axios
            .put(process.env.REACT_APP_BO_URL + "/bo/viewer/" + viewerID + "/layers", { viewerlayers: layersPut })
            .then(() => {
                // console.log(response);
                const groupsPut = groups.map(c => {
                    let groupPut = {
                        id: c.id,
                        title: c.title
                    };
                    return groupPut;
                });
                axios
                    .put(process.env.REACT_APP_BO_URL + "/bo/viewer/" + viewerID + "/groups", { viewergroups: groupsPut })
                    .then(() => {
                        this.setError('Camadas atualizadas com sucesso', 'Camadas atualizadas com sucesso');
                        // console.log(response);
                    })
                    .catch(error => {
                        console.log(error);
                        this.setError('Erro ao atualizar camadas', 'Erro ao atualizar camadas');
                    });
            })
            .catch(error => {
                console.log(error);
                this.setError('Erro ao atualizar camadas', 'Erro ao atualizar camadas');
            });
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

        const selectedRow = state.selectedRowLayers || [];

        this.setState({
            buttons: [{
                glyph: '1-close',
                tooltip: 'Fechar e Retornar aos Visualizadores',
                visible: !state.editLayer,
                bsStyle: 'primary',
                onClick: () => {
                    history.goBack();
                }
            },
            {
                glyph: 'floppy-disk',
                tooltip: 'Gravar Visualizador',
                visible: !state.editLayer,
                bsStyle: 'primary',
                onClick: () => {
                    this.updateLayersOnServer(props.viewer, this.state.treeData);
                }
            }, {
                glyph: 'plus',
                tooltip: 'Adicionar um grupo',
                visible: !state.createViewer,
                onClick: () => {
                    this.onAdd();
                }
            }, {
                glyph: 'pencil',
                tooltip: 'Editar a camada selecionada',
                visible: selectedRow.length === 1 && !state.editLayer,
                onClick: () => {
                    this.onEditLayer(selectedRow);
                }
            }, {
                glyph: 'trash',
                tooltip: 'Remover a camada selecionada',
                visible: selectedRow.length > 0 && !state.editLayer,
                onClick: () => {
                    const viewerID = selectedRow[0];

                    this.setState({
                        selectedRow: [],
                        _rows: this.state._rows.filter(row => row.id !== viewerID)
                    });

                    this.setState({
                        selectedRowLayers: null
                    });
                }
            }]
        });
    }
}

const ViewerLayersPlugin = connect((state) => ({
    auth: state.security
}), {
    setOption
})(ViewerLayers);

module.exports = {
    ViewerLayersPlugin
};
