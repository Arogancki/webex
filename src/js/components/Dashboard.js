import React from "react"
import Cookies from 'universal-cookie'

import InputField from "./InputField"
import statuses from "../lib/statuses"
import Video from "./Video"

const cookies = new Cookies();

export default class Dashboard extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            chatRoom: null,
            rooms: [],
            messages: []
        }
    }
    componentDidMount(){
        this.showRooms()
        this.getMessages()
    }
    activeChatRoom(id){
        this.setState({...this.state, chatRoom: id, messages: []})
    }
    newPrivateCall(v){
        const self = this
        let email = ""
        return self.props.spark.memberships.list()
        .then(memberships=>{
            email = memberships.items[0].personEmail
            if (email.toLocaleLowerCase() === v.toLocaleLowerCase())
                throw new Error("You can't do a call with yourself")
            return memberships
        })
        .then(membeships=>Promise.all(membeships.items.map(membership=>{
            return self.props.spark.memberships.list({
                roomId: membership.roomId
            }).then(members=>{
                return {
                ...membership,
                members: members.items
            }})
        })))
        .then(membeships=>membeships.filter(membership=>
            membership.members.length === 2
            && membership.members.find(m=>m.personEmail === email)
            && membership.members.find(m=>m.personEmail === v)
        ))
        .then(membeships=>membeships.length 
            ? self.newCall.call(self, membeships[0].roomId)
            : self.props.spark.rooms.create({title: `Private call with ${v}`})
                .then(room=>self.props.spark.memberships.create({
                    personEmail: v,
                    roomId: room.id
                }))
                .then(membership=>self.newCall.call(self, membership.roomId))
        )
        .catch(e=>alert(e.message))
    }
    newCall(v){
        //cookies.set('invitee', v, { path: '/' })
        this.props.call(v)
    }
    inviteToRoom(id){
        const email = prompt(`who you'd like to invite?`)
        if (!email)
            return 
        return this.props.spark.memberships.create({
            personEmail: email,
            roomId: id
        })
        .then(data=>alert(`${email} invited.`))
        .catch(e=>alert(`${e.message}.`))
    }
    showRooms(){
        return this.props.spark.rooms.list()
        .then(rooms=>Promise.all(rooms.items.map(r=>
            this.props.spark.memberships.list({
                roomId: r.id
            })
            .then(members=>{return {
                ...r,
                members: members.items
            }})
        )))
        .then(rooms=>{
            return this.setState({
                ...this.state, 
                rooms: rooms
            })
        })
    }
    crateRoom(title){
        this.props.spark.rooms.create({title: title})
        .then(room=>{
            return this.showRooms()
        })
        .then(r=>alert('done'))
    }

    remove(){
        Promise.all(this.props.callStatus.call.memberships.models.filter(m=>!m.isSelf).map(m=>{
            return this.props.spark.people.get(m.personId || m.personUuid || m).then(p=>{return {
                membership: m,
                ...p
            }})
        })).then(members=>{
            const choise = prompt(`Which one You'd like to remove? (${members.map(m=>`"${m.displayName}"`).join(', ')} ) `)
            if (!choise)
                return
            const toRemove = members.find(m=>m.displayName.toLowerCase() === choise.toLowerCase())
            if (!toRemove)
                return alert('User is invalid')
            
            return this.props.spark.memberships.list({
                roomId: this.props.callStatus.roomId,
                personEmail : toRemove.emails[0]
            })
        }).then(membership=>{
            if (membership.items.length !== 1)
                return alert('User is invalid')

            return this.props.spark.memberships.remove(membership.items[0]).then(d=>{
                return alert('removed')
            })
        }).catch(e=>{
            alert(e.message)
        })
    }

    sendMessage(message){
        return this.props.spark.messages.create({
            text: message,
            roomId : this.state.chatRoom
        })
    }

    getMessages(roomId){
        const self = this;
        let lastRoomId = self.state.chatRoom;
        (function pool(){
            if (!self.state.chatRoom)
                return setTimeout(pool, 1000)
            return self.props.spark.messages.list({
                roomId: self.state.chatRoom
            }).then(messages=>{
                if (lastRoomId === self.state.chatRoom
                && messages.items.length === self.state.messages.length)
                    return setTimeout(pool, 1000)
                lastRoomId = self.state.chatRoom
                self.setState({...self.state, messages: messages.items})
                return setTimeout(pool, 1000)
            }).catch(err=>{
                alert(`chat error: ${err.message}`)
            })
        })()
    }

    deleteRoom(roomId){
        const self = this
        return self.props.spark.memberships.list()
        .then(membership=>membership.items[0].personEmail)
        .then(email=>self.props.spark.memberships.list({
            roomId: roomId,
            personEmail: email
        }))
        .then(membeships=>{
            if (membeships.items.length !== 1)
                throw new Error('Invalid')
            return self.props.spark.memberships.remove(membeships.items[0])
        }).then(d=>{
            alert('you left the room')
            return self.showRooms()
        }).catch(e=>alert(e.message))
    }

    render(){
        const screenShareButtonLabel = (this.props.callStatus.localScreenShare||{}).active ? 'stop sharing' : null;
        
        const participants = this.props.callStatus.members
        .map((m, k)=><li key={k}>{`${k}:`}<ul>{Object.keys(m)
            .map(k=><li key={k}>{`${k}: ${m[k]}`}</li>)}</ul></li>)

        window.debug = this.props.callStatus.members

        const meeting = <div style={{minHeight: "400px"}}>
            <p>status: {this.props.callStatus.status}</p>
            <div style={{display: 'flex', maxHeight: "300px"}}>
                <div style={{width: '35%', display: 'flex', justifyContent: 'center'}}>
                    <div style={{width: '50%'}}>
                        {
                            this.props.callStatus.sendingVideo ? 
                            <Video key={1} srcObject={this.props.callStatus.selfView}/>
                            : ''
                        }
                    </div>

                    <div style={{width: '50%'}}>
                        {
                            (this.props.callStatus.localScreenShare||{}).active ? 
                            <Video key={2} srcObject={this.props.callStatus.localScreenShare}/>
                            : ''
                        }
                    </div>
                </div>
                <div style={{width: '35%', display: 'flex', justifyContent: 'center'}}>
                    {
                        this.props.callStatus.receivingVideo ? 
                        <Video srcObject={this.props.callStatus.remoteView}/>
                        : ''
                    }
                </div>

                <div style={{width: '30%'}}>
                    {
                        this.state.chatRoom ? 
                        <div style={{height: "100%"}}>
                            <p style={{height: "10%"}}>Chat: </p>
                            <div style={{height: "80%", overflow: "scroll", maxHeight: "400px"}}>
                                <ul>{this.state.messages.map((m, k)=><li key={k}>
                                    {`${m.personEmail} (${m.created}): ${m.text}`}
                                </li>)}</ul>
                            </div>
                            <div style={{height: "10%"}}>
                                <InputField 
                                    label="Message: "
                                    submit="send"
                                    placeholder="Type your message here"
                                    onSubmit={this.sendMessage.bind(this)}
                                /> 
                            </div> 
                        </div>:
                        <p>Select room to active a chat</p>
                    }
                </div>
            </div>
        </div>

        function printAll(object, tab=0){
            if (tab>-1) return []
            return Object.getOwnPropertyNames({...object}).map(v=>{
                if (object[v] === null || object[v] === undefined)
                    return <li key={v}>{'\t'.repeat(tab) + v + ": non"}</li>
                if (typeof object[v] === "function")
                    return <li key={v}>{'\t'.repeat(tab) + v + " function"}</li>
                if (typeof object[v] === "object")
                    return <li key={v}>
                        {'\t'.repeat(tab) + v + ":\n { "}
                            <ul>
                                {printAll(object[v], ++tab)}
                            </ul>
                        {" }"}
                    </li>
                return <li key={v}>{'\t'.repeat(tab) + v + ": " + object[v]}</li>
            })
        }

        function printRooms(rooms, deleteRoom, activeChatRoom, inviteToRoom, call){
            return rooms.map((room, key)=>{
                return <li key={key}>
                    {
                        <div style={{display: "flex"}}>
                            <p>{`${room.title} :`}</p>
                            <p>{` (users: ${room.members.map(u=>`${u.personDisplayName} (${u.personEmail})`)})`}</p>
                            <button type="button" onClick={(e) => call(room.id)}>call</button>
                            <button type="button" onClick={(e) => inviteToRoom(room.id)}>invite</button>
                            <button type="button" onClick={(e) => activeChatRoom(room.id)}>active chat</button>
                            <button type="button" onClick={(e) => deleteRoom(room.id)}>leave</button>
                        </div>
                    }
                </li>
            })
        }

        return <div>

            <button type="button" onClick={(e) => this.showRooms()}>show rooms</button>

            <div>
                <ul>{printRooms(this.state.rooms, this.deleteRoom.bind(this), this.activeChatRoom.bind(this),
                     this.inviteToRoom.bind(this), this.newCall.bind(this))}</ul>
            </div>

            <InputField 
                label="Title: "
                submit="create a new room"
                placeholder=""
                onSubmit={v => this.crateRoom(v)}
            />

            <InputField 
                label="Call a user directly: "
                submit="call"
                placeholder="email"
                onSubmit={v => this.newPrivateCall(v)}
                value = {cookies.get('invitee')}
            />
            <div>{meeting}</div>
            <p>{(((this.props.callStatus.call||{}).locus||{}).info||{}).sipUri || ""}</p>
            <p>active participants: {this.props.callStatus.activeParticipantsCount}</p>
            <ul>{participants}</ul>
            {this.props.callStatus.hangup && <button type="button" onClick={this.props.callStatus.hangup.bind(this)}>hang up</button>}
            {this.props.callStatus.localVideoSwitch && <button type="button" onClick={this.props.callStatus.localVideoSwitch.bind(this)}>localVideoSwitch</button>}
            {this.props.callStatus.localAudioSwitch && <button type="button" onClick={this.props.callStatus.localAudioSwitch.bind(this)}>localAudioSwitch</button>}
            {this.props.callStatus.remoteVideoSwitch && <button type="button" onClick={this.props.callStatus.remoteVideoSwitch.bind(this)}>remoteVideoSwitch</button>}
            {this.props.callStatus.remoteAudioSwitch && <button type="button" onClick={this.props.callStatus.remoteAudioSwitch.bind(this)}>remoteAudioSwitch</button>}
            {this.props.callStatus.screenShareSwitch && <button type="button" onClick={this.props.callStatus.screenShareSwitch.bind(this)}>{screenShareButtonLabel||'share screen'}</button>}
            {this.props.callStatus.applicationShareSwitch && <button type="button" onClick={this.props.callStatus.applicationShareSwitch.bind(this)}>{screenShareButtonLabel||'share application'}</button>}
            {this.props.callStatus.call && this.props.callStatus.call.isActive && <button type="button" onClick={this.remove.bind(this)}>remove</button>}

            <p>{this.props.callStatus.info || ''}</p>
            <button type="button" onClick={(e) => this.props.logout()}>logout</button>
            <div>
                <ul>{printAll(this.props.callStatus)}</ul>
            </div>
        </div>
    }
}