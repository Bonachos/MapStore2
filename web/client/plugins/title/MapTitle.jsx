const React = require('react');
const PropTypes = require('prop-types');
const assign = require('object-assign');
const ContainerDimensions = require('react-container-dimensions').default;

require('./maptitle.less');

class MapTitle extends React.Component {
    static propTypes = {
        mapId: PropTypes.string,
        title: PropTypes.string,
        position: PropTypes.number
    };

    // Then we add our constructor which receives our props
    constructor(props) {
        super(props);
        // Next we establish our state
        let title = this.props.title;
        if (this.props.mapId) {
            title = this.props.mapId;
        }
        this.state = {
            name: '',
            title: `${title}`
        };
        // To use the 'this' keyword, we need to bind it to our function
        this.onChange = this.onChange.bind(this);
    }

    // A custom function to change the name in our state to match the user input
    onChange(e) {
        this.setState({
            name: e.target.value
        });
    }
    // The render function, where we actually tell the browser what it should show
    render() {
        return (
            <div className="header-content">
                <div>&nbsp; {this.state.title} {this.state.name}</div>
            </div>
        );
    }
}

module.exports = {
    MapTitlePlugin: assign(MapTitle, {
        OmniBar: {
            name: 'title',
            position: 6,
            priority: 1,
            tool: true
        }
    }),
    reducers: { maps: require('../../reducers/map') }
};
