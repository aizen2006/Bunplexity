
export default function OauthCard(){
    return(
        <div className="max-w-sm rounded-2xl overflow-hidden shadow-lg bg-gray-700 hover:shadow-2xl transtion duration-300">
            <h4 className=" font-semibold ">Login With</h4>
            <div className="">
                <button className="">Google</button>
                <button className="">Github</button>
            </div>
        </div>
    )
}