import statuses from "../../lib/statuses"

import actionFactory from "../../actions/actionFactory"
import types from "../../actions/types"

const REGISTER_STATUS_CHANGE = actionFactory(types.REGISTRATION_STATUS_CHANGED)
const INCOMING_CALL = actionFactory(types.INCOMING_CALL)

export function connect(spark, action){
    return Promise.resolve()
    .then(()=>{
        if (spark.phone.registered){
            return Promise.resolve()
        }
        spark.phone.on('call:incoming', call => {
            Promise.resolve()
            .then(()=>{
                const id = (call.from || {}).personId
                if (id)
                    return spark.people.get(id)
                return {
                    displayName: call.locus.host.name,
                    emails: [call.locus.host.email],
                    id: call.locus.host.id
                }
            })
            .then(id=>'Incoming call' + (id ? ` from ${id.displayName || id} 
                ${id.emails.length ? `email: (${id.emails[0]})` : ''} `
                : ''))
            .then(msg=>confirm(msg))
            .then(confirmation=>{
                if (!confirmation){
                    call.reject()
                    call.hangup()
                    return Promise.resolve()
                }
                call.answer(call.locus)
                action.asyncDispatch(INCOMING_CALL(call))
            })
        })
        action.asyncDispatch(REGISTER_STATUS_CHANGE(statuses.PENDING))
        return spark.phone.register()
        .then(ack => action.asyncDispatch(REGISTER_STATUS_CHANGE(statuses.DONE)))
        .catch(err => {
            action.asyncDispatch(REGISTER_STATUS_CHANGE({status: statuses.REJECTED, info: err}))
            return Promise.reject()
        })
    })
}