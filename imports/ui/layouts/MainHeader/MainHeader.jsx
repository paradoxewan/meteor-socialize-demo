import { Meteor } from 'meteor/meteor';
import { User } from 'meteor/socialize:user-model';
import { Request } from 'meteor/socialize:requestable';
import { withTracker } from 'meteor/react-meteor-data';
import { browserHistory } from 'meteor/communitypackages:react-router-ssr';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, NavItem, MenuItem, Dropdown, Badge, Glyphicon } from 'react-bootstrap';
import queryString from 'query-string';
import ReactResizeDetector from 'react-resize-detector';

import { addQuery, removeQuery } from '../../../utils/router.js';
import FriendsList from '../../components/FriendsList/FriendsList.jsx';
import OnlineFriends from '../../components/OnlineFriends/OnlineFriends.jsx';
import RequestItem from '../../components/RequestItem/RequestItem.jsx';
import LatestConversationCollection from '../../../config/collection.js';

class MainHeader extends Component {
    state = { showFriends: false, isMobile: false, coloredNavbar: false }
    componentDidMount() {
        const { user } = this.props;

        this.newConvoSound.volume = 0.5;
        this.newRequestSound.volume = 0.25;

        this.unreadConversationObserver = user.unreadConversations().observeChanges({
            added: () => {
                if (window.convosReady) {
                    this.newConvoSound && this.newConvoSound.play().catch(() => { });
                }
            },
        });

        this.friendRequestObserver = user.friendRequests().observeChanges({
            added: () => {
                if (window.requestsReady) {
                    this.newRequestSound && this.newRequestSound.play().catch(() => { });
                }
            },
        });

        window.addEventListener('scroll', this.handleScroll);
    }
    componentWillUnmount() {
        this.unreadConversationObserver.stop();
        this.friendRequestObserver.stop();

        window.removeEventListener('scroll', this.handleScroll);
    }
    onResize = (width) => {
        if (width) {
            if (width > 1470) {
                this.setState({ hideOnlineFriends: false });
            } else {
                this.setState({ hideOnlineFriends: true });
            }

            if (width < 768) {
                this.setState({ isMobile: true });
            } else {
                this.setState({ isMobile: false });
            }
        }
    }
    handleScroll = () => {
        const { scrollY } = window;
        const { coloredNavbar } = this.state;
        if (scrollY >= 20 && !coloredNavbar) {
            this.setState({ coloredNavbar: true });
        }

        if (scrollY < 20 && coloredNavbar) {
            this.setState({ coloredNavbar: false });
        }
    }
    handleShow = () => {
        addQuery({ showFriends: true });
    }
    handleHide = () => {
        removeQuery('showFriends');
    }
    handleLogout = () => {
        Meteor.logout((error) => {
            if (!error) {
                browserHistory.replace('/');
            }
        });
    };
    render() {
        const { user, numUnreadConversations, newestConversationId, children, showFriends, paddingTop, requests, numRequests } = this.props;
        const { coloredNavbar, hideOnlineFriends, isMobile } = this.state;
        const navbarStyle = coloredNavbar ? { backgroundColor: '#8C5667' } : {};
        const className = hideOnlineFriends ? 'full' : '';
        return (
            <div id="content-container">
                <audio ref={(ref) => { this.newConvoSound = ref; }} preload="auto" >
                    <source src="/blip.mp3" type="audio/mpeg" />
                </audio>
                <audio ref={(ref) => { this.newRequestSound = ref; }} preload="auto">
                    <source src="/harp.mp3" type="audio/mpeg" />
                </audio>
                <ReactResizeDetector handleWidth onResize={this.onResize} refreshMode="throttle" refreshRate={200} />
                <div id="main-content" className={className}>
                    <div style={{ paddingTop }}>
                        <Navbar fixedTop style={navbarStyle}>
                            <Navbar.Header>
                                <Navbar.Brand>
                                    <Link to="/">Socialize</Link>
                                </Navbar.Brand>
                            </Navbar.Header>

                            <Nav>
                                <LinkContainer to={isMobile ? '/messages' : `/messages/${newestConversationId || 'new'}`}><NavItem><Glyphicon glyph="inbox" /> <Badge>{numUnreadConversations}</Badge></NavItem></LinkContainer>
                            </Nav>

                            <Dropdown id="requests-dropdown-button" >
                                <Dropdown.Toggle noCaret bsStyle="link">
                                    <Glyphicon glyph="user" />
                                    <Badge>{numRequests}</Badge>
                                </Dropdown.Toggle>
                                <Dropdown.Menu id="requests-dropdown">
                                    {requests && requests.length > 0 ?
                                        requests.map(request => <RequestItem key={request._id} request={request} />) :
                                        <div className="request-item">
                                            <p className="no-requests text-danger">No Requests</p>
                                        </div>
                                    }
                                </Dropdown.Menu>
                            </Dropdown>

                            <div className="pull-right">
                                <Dropdown id="user-nav-dropdown-button" >
                                    <Dropdown.Toggle bsStyle="link">
                                        {user.username}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu id="user-nav-dropdown">
                                        <LinkContainer to={`/profile/${user.username}`}>
                                            <MenuItem>My Profile</MenuItem>
                                        </LinkContainer>
                                        {user.friendCount > 0 && <MenuItem onClick={this.handleShow}>Friends</MenuItem>}
                                        <MenuItem divider />
                                        <MenuItem onClick={this.handleLogout}>Logout</MenuItem>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                        </Navbar>
                        {children}
                        {showFriends && <FriendsList show={showFriends} handleHide={this.handleHide} />}
                    </div>
                </div>
                {!hideOnlineFriends && <OnlineFriends user={user} />}
            </div>
        );
    }
}

MainHeader.propTypes = {
    user: PropTypes.instanceOf(User),
    showFriends: PropTypes.bool,
    numUnreadConversations: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    numRequests: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    requests: PropTypes.arrayOf(PropTypes.instanceOf(Request)),
    newestConversationId: PropTypes.string,
    children: PropTypes.node,
    paddingTop: PropTypes.string,
};

MainHeader.defaultProps = {
    paddingTop: '80px',
};

const MainHeaderContainer = withTracker(({ user, params, location: { search } }) => {
    const query = queryString.parse(search);
    const requestsReady = Meteor.subscribe('socialize.friendRequests', {}).ready();
    const convosReady = Meteor.subscribe('unreadConversations').ready();

    const requests = user.friendRequests().fetch();
    const latestConversation = LatestConversationCollection.findOne();
    const newestConversationId = params.conversationId || (latestConversation && latestConversation.conversationId);
    const numUnreadConversations = user.numUnreadConversations() || '';

    if (typeof window !== 'undefined') {
        window.requestsReady = requestsReady;
        window.convosReady = convosReady;
    }

    return {
        user,
        numUnreadConversations,
        newestConversationId,
        requests,
        numRequests: requests.length || '',
        showFriends: !!query.showFriends,
    };
})(MainHeader);

export default MainHeaderContainer;
