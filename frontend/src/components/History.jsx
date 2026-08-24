import { useEffect, useState } from "react";

export default function History() {

    const [chats, setChats] = useState([]);

    useEffect(() => {

        fetch("http://127.0.0.1:5000/chats")
            .then(res => res.json())
            .then(data => {
                setChats(data);
            })
            .catch(err => {
                console.log("History error:", err);
            });

    }, []);


    return (

        <div className="text-white w-full p-10">

            <h1 className="text-3xl mb-8">
                Chat History
            </h1>


            {
                chats.map((chat) => (

                    <div 
                        key={chat.id} 
                        className="mb-6"
                    >

                        <p className="text-gray-400">
                            Chat:
                        </p>

                        <p>
                            {chat.title}
                        </p>


                        <hr className="my-4 border-gray-700"/>

                    </div>

                ))
            }


        </div>

    );
}