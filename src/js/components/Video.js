import React from "react"
import { MoonLoader, BounceLoader} from 'react-spinners'

export default class Dashboard extends React.Component {
    render(){
        return this.props.srcObject ?
        (
            <div style={{position: "relative"}}>
                <div style={{top: '50%', margin: '0 auto', zIndex: '-1', position: "absolute"}}><BounceLoader color={"grey"}/></div>
                <video style={{zIndex: '1', maxHeight: '100%', maxWidth: '100%'}} ref={e=>(e || {}).srcObject = this.props.srcObject} autoPlay/> 
            </div>
        ) :
        <div style={{display: "flex", justifyContent: "center", position: "relative"}}>
            <div style={{top: '50%', margin: '0 auto', zIndex: '-1', position: "absolute"}}><MoonLoader color={"grey"}/></div>
        </div>
    }
}