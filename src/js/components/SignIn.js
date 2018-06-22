import React from "react"

import statuses from "../lib/statuses"
import InputField from "./InputField"

export default class SignIn extends React.Component {
    render(){
        return <div>
          <p>{this.props.status===statuses.REJECTED && `REJECTED: ${this.props.info}`}</p>
          <InputField 
            label="Acces token: "
            submit="Sign in"
            onSubmit={this.props.signIn} 
          />
        </div>
    }
}