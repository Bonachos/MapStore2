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
const { Row, Col, Grid, NavItem, Nav, FormControl, FormGroup } = require('react-bootstrap');
const ContainerDimensions = require('react-container-dimensions').default;
require('react-quill/dist/quill.snow.css');
const { connect } = require('react-redux');
const { setOption } = require('../actions/mockups');
require('codemirror/mode/sql/sql');
const axios = require('axios');
const ModalWindow = require('../components/misc/ResizableModal');
const Dialog = require('../components/misc/Dialog');
const FileUploader = require('../components/file/FileUploader');
const Message = require('../components/I18N/Message');

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
                            show={this.state._rows && this.state._rows.length === 0}
                            showClose={false}
                            onClose={this.close}
                            title={"Não existem Dados Vetoriais"}
                            disableModalMode>
                            <div className="ms-detail-body">
                                Crie o seu primeiro Dado Vetorial utilizando o botão
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

class GeoData extends React.Component {

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
        singleEntity: PropTypes.bool
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
            file: '',
            url: '',
            anonymous: false,
            inactive: false
        },
        activeKey: "1",
        _columns: [
            { key: 'name', name: 'Nome', filterable: true },
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
                name: '',
                url: '',
                file: '',
                defaultStyle: {},
                entity: this.state._entities ? this.state._entities[0].name : "default"
            },
            initialViewer: {
                name: '',
                url: '',
                file: '',
                entity: this.state._entities ? this.state._entities[0].name : "default"
            },
            editState: 'create'
        });
    }

    onEdit() {
        const currentItem = head(this.state._rows.filter(row => isNumber(this.state.selectedRowViewers[0]) && row.id === this.state.selectedRowViewers[0]));
        if (currentItem) {
            this.setState({
                createViewer: true,
                editState: 'edit',
                currentViewer: currentItem,
                initialViewer: { ...currentItem }
            });
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
                enabled: false,
                placeholder: 'O nome do Dado Vetorial'
            }, {
                label: 'Entidade',
                valueField: 'entity',
                enabled: true,
                required: true,
                selectOptions: this.state._entities
            }
        ];
        if (this.props.singleEntity) {
            rowData = rowData.filter(row => row.label !== "Entidade");
        }

        const onChange = (key, value) => {
            if (key === 'entity') {
                let entityname = this.state._entities.find(e => { return e.name === value; }).label;
                this.setState({
                    currentViewer: { ...this.state.currentViewer, [key]: value, entityname: entityname }
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
                                            <FormControl
                                                disabled={!d.enabled}
                                                value={itemToRender && itemToRender[d.valueField]}
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
                <Row>
                    <Col xs={12} sm={6}>
                        Ficheiro:
                    </Col>
                    <Col xs={12} sm={6}>
                        <FileUploader
                            dropZoneStyle={{
                                borderStyle: "dashed",
                                minHeight: "100px",
                                borderWidth: "3px",
                                verticalAlign: "middle",
                                transition: "all 0.3s ease-in-out"
                            }}
                            dropZoneActiveStyle={{
                                backgroundColor: "#eee",
                                borderWidth: "5px",
                                boxShadow: "0px 0px 25px 14px #d9edf7"

                            }}
                            // error={this.props.taskCreationError}
                            beforeUploadMessage={<Message msgId=" " />}
                            dropMessage={<Message msgId={"Arraste ficheiro para aqui"} />}
                            // uploading={this.uploading}
                            allowUpload
                            // onBeforeUpload={this.props.createImport.bind(null, this.getImportCreationDefaults())}
                            onUpload={ this.onUpload.bind(null, this) } // {this.props.uploadImportFiles.bind(null, this.props.selectedImport && this.props.selectedImport.id)}
                            // uploadAdditionalParams={this.getPresets()}
                        />
                    </Col>
                </Row>
            </Grid>
        );
    }

    renderSelectOptions = (options) => {
        return options.map((format) => <option value={format.name} key={format.name}>{format.label}</option>);
    };

    renderPanelTab() {
        switch (this.state.activeKey) {
        case "1":
            return this.renderEdit(this.state.currentViewer);
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

    onUpload(that, files) {
        that.setState({
            currentViewer: { ...that.state.currentViewer, name: files[0].name, file: files[0] }
        });
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
                        title={"Não possui permissões para gerir Dados Vetoriais."}
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


    uploading() {

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

    boGet() {
        let selectedEntity = this.props.entity;
        if (this.props.singleEntity) {
            selectedEntity = "default";
        }

        if (this.props.auth.user) {
            axios
                .get(process.env.REACT_APP_BO_URL + "/bo/geodata", {
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

        // const data = {
        //     name: this.state.currentViewer.name,
        //     file: this.state.currentViewer.file
        // };

        let formData = new FormData();
        formData.append("file", this.state.currentViewer.file);
        formData.append("entity", itemToAdd.entity);

        axios.post(process.env.REACT_APP_CONTEXTS_URL + "geodataupload", formData, { headers: {'Content-Type': 'multipart/form-data'}}).then(response => {
            // TODO: Update the list instead of reloading the page. But first it's necessary to confirm if duplicate is not being added.
            // this.setState({
            //     activeKey: "1",
            //     createViewer: false,
            //     regionOI: false,
            //     _rows: [{ ...this.state.currentViewer, id: Number(response.data), grab: 0 }, ...this.state._rows]
            // });

            location.reload();
        });

        // axios
        //     .post(process.env.REACT_APP_BO_URL + "/bo/geodata", { "geodata": itemToAdd }, {
        //         headers: {
        //             'Authorization': `Bearer ` + this.props.auth.token
        //         }
        //     })
        //     .then(response => {
        //         // const newViewers = response.data.map(c => {
        //         //     return {
        //         //         id: c.id,
        //         //         name: c.name,
        //         //         url: c.url
        //         //     };
        //         // });

        //         // const newState = Object.assign({}, this.state, {
        //         //     _rows: newViewers
        //         // });

        //         // this.setState(newState);

        //         this.setState({
        //             activeKey: "1",
        //             createViewer: false,
        //             regionOI: false,
        //             _rows: [{ ...this.state.currentViewer, id: Number(response.data), grab: 0 }, ...this.state._rows]
        //         });
        //     })
        //     .catch(error => {
        //         console.log(error);
        //         this.setError('Erro ao adicionar Dado Vetorial', 'Erro ao adicionar Dado Vetorial');
        //     });
    }

    boEdit(itemToEdit) {
        axios
            .put(process.env.REACT_APP_BO_URL + "/bo/geodata/" + itemToEdit.id, { geodata: itemToEdit })
            .then(() => {
                this.componentDidMount();
                this.setState({
                    activeKey: "1",
                    createViewer: false,
                    regionOI: false
                });
            })
            .catch(error => {
                console.log(error);
                this.setError('Erro ao editar Dado Vetorial', 'Erro ao editar Dado Vetorial');
            });
    }

    boRemove(itemToRemoveID) {
        axios
            .delete(process.env.REACT_APP_BO_URL + "/bo/geodata/" + itemToRemoveID)
            .then(location.reload())
            .catch(error => {
                console.log(error);
                this.setError('Erro ao remover Dado Vetorial', 'Erro ao remover Dado Vetorial');
            });
    }

    checkValidity(itemToCheck) {
        if (isNil(itemToCheck.name) || itemToCheck.name === '') {
            return 'Por favor preencha o campo Nome';
        }
        if (isNil(itemToCheck.file) || itemToCheck.file === '') {
            return 'Por favor carregue um Ficheiro';
        }

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
                glyph: 'plus',
                tooltip: 'Adicionar um Dado Vetorial',
                visible: props.auth.user && !state.createViewer && selectedRow.length === 0,
                onClick: () => {
                    this.onAdd();
                }
            },
            // {
            //     glyph: 'pencil',
            //     tooltip: 'Editar o Dado Vetorial selecionado',
            //     visible: props.auth.user && selectedRow.length === 1 && !state.createViewer,
            //     onClick: () => {
            //         this.onEdit();
            //     }
            // },
            {
                glyph: 'trash',
                tooltip: 'Remover Dados Vetoriais selecionados',
                visible: props.auth.user && selectedRow.length > 0 && !state.createViewer,
                onClick: () => {
                    let rows = this.state._rows;
                    this.state.selectedRowViewers.forEach(selectedRowID => {
                        let rowRemove = rows.find(row => row.id === selectedRowID);
                        this.boRemove(rowRemove.entity + "_-_" + rowRemove.name);
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

const GeoDataPlugin = connect((state) => ({
    auth: state.security,
    selectedRow: state.mockups && state.mockups.selectedRowViewers || []
}), {
    setOption
})(GeoData);

module.exports = {
    GeoDataPlugin
};
