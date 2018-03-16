import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Conversation, Message } from 'meteor/socialize:messaging';
import { Scrollbars } from 'react-custom-scrollbars';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Link } from 'react-router';

import UserAvatar from '../UserAvatar/UserAvatar.jsx';
import MessageComposer from '../../components/MessageComposer/MessageComposer.jsx';

class MessagesContainer extends Component {
    componentDidUpdate() {
        const { currentConversation, messagesReady } = this.props;
        if (messagesReady && (currentConversation && (this.scrollDiff > -10 || this.conversationId !== currentConversation._id))) {
            this.conversationId = currentConversation._id;
            /* If scroll is close to bottom, we'll scroll to bottom as new
                messages are added */
            this.goToBottom();
        }
    }
    onScrollFrame = (values) => {
        /* figure out if the user has scrolled up so we don't try to scroll
            back down when they are trying to read previous messages */
        const { scrollTop, clientHeight, scrollHeight } = values;
        this.scrollDiff = (scrollTop + clientHeight) - scrollHeight;
    }
    onSend = () => {
        this.goToBottom();
    }
    goToBottom = () => {
        this.scrollView.scrollToBottom();
    }
    render() {
        const { messages, messagesReady, currentConversation } = this.props;

        return (
            <div id="messages-column">
                <Scrollbars
                    className="scroll-area"
                    universal
                    renderThumbVertical={props => <div {...props} className="thumb-vertical" />}
                    onScrollFrame={this.onScrollFrame}
                    ref={(ref) => { this.scrollView = ref; }}
                >

                    <div id="messages-container">
                        {messagesReady && messages &&
                            messages.map((message) => {
                                const sender = message.user();
                                const self = sender.isSelf() && 'self';
                                return (
                                    <div className={`message ${self}`} key={message._id}>
                                        <div>
                                            <UserAvatar
                                                user={sender}
                                                size={60}
                                            />
                                        </div>
                                        <div className="chat-bubble">
                                            <p>{message.body}</p>
                                            <div className="username">
                                                <small>
                                                    <Link to={`/profile/${sender.username}`}>{sender.displayName()}</Link> -
                                                    <small>{message.timestamp()}</small>
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </Scrollbars>
                <MessageComposer conversation={currentConversation} onFocus={this.goToBottom} onSend={this.onSend} />
            </div>
        );
    }
}

MessagesContainer.propTypes = {
    messages: PropTypes.arrayOf(PropTypes.instanceOf(Message)),
    messagesReady: PropTypes.bool,
    currentConversation: PropTypes.instanceOf(Conversation),
};

const ConversationArea = withTracker(({ currentConversation }) => {
    let messagesReady;
    let messages;
    if (currentConversation) {
        messagesReady = Meteor.subscribe('socialize.messagesFor', currentConversation._id).ready();
        messages = currentConversation.messages().fetch();
    }
    return {
        currentConversation,
        messagesReady,
        messages,
    };
})(MessagesContainer);

export default ConversationArea;
