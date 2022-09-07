import React, { useState, useEffect } from "react";

import { firebase } from "./firebase/firebase";

const authenticatedUser = "Iman";

export default function App() {
  const [votes, setVotes] = useState({});
  const [voteChanges, setVoteChanges] = useState(0);

  // Snapshot listeners to retrieve and combine the messages and votes
  useEffect(() => {
    const messagesQuery = firebase.db.collection("messages");
    const messagesSnapshot = messagesQuery.onSnapshot((snapshot) => {
      const docChanges = snapshot.docChanges();
      setVotes((oldVotes) => {
        const oVotes = { ...oldVotes };
        for (let change of docChanges) {
          if (change.doc.id in oVotes) {
            oVotes[change.doc.id] = {
              ...oVotes[change.doc.id],
              ...change.doc.data(),
            };
          } else {
            oVotes[change.doc.id] = change.doc.data();
          }
        }
        return oVotes;
      });
    });

    const votesQuery = firebase.db
      .collection("mVotes")
      .where("voter", "==", authenticatedUser);
    const votesSnapshot = votesQuery.onSnapshot((snapshot) => {
      const docChanges = snapshot.docChanges();
      setVotes((oldVotes) => {
        const oVotes = { ...oldVotes };
        for (let change of docChanges) {
          const voteData = change.doc.data();
          const itemId = voteData.messageId;
          const newVote = voteData.userVote;
          if (oVotes[itemId].userVote !== newVote) {
            setVoteChanges((oldCount) => oldCount + 1);
          }
          if (itemId in oVotes) {
            oVotes[itemId] = {
              ...oVotes[itemId],
              voter: voteData.voter,
              userVote: newVote,
            };
          } else {
            oVotes[itemId] = {
              voter: voteData.voter,
              userVote: newVote,
            };
          }
        }
        return oVotes;
      });
    });
    return () => {
      messagesSnapshot();
      votesSnapshot();
    };
  }, []);

  const upVote = (mId) => async (event) => {
    const messageRef = firebase.db.collection("messages").doc(mId);
    await firebase.db.runTransaction(async (t) => {
      const messageDoc = await t.get(messageRef);
      if (messageDoc.exists) {
        const messageData = messageDoc.data();
        const mVoteDocs = await firebase.db
          .collection("mVotes")
          .where("messageId", "==", mId)
          .where("voter", "==", authenticatedUser)
          .get();
        if (mVoteDocs.docs.length > 0) {
          const voteData = mVoteDocs.docs[0].data();
          const mVoteRef = firebase.db
            .collection("mVotes")
            .doc(mVoteDocs.docs[0].id);
          t.update(mVoteRef, {
            userVote: !voteData.userVote,
            dateTime: firebase.firestore.Timestamp.fromDate(new Date()),
          });
          t.update(messageRef, {
            totalVotes: messageData.totalVotes + (voteData.userVote ? -1 : 1),
          });
        } else {
          const mVoteRef = firebase.db.collection("mVotes").doc();
          t.set(mVoteRef, {
            messageId: mId,
            voter: authenticatedUser,
            userVote: true,
            dateTime: firebase.firestore.Timestamp.fromDate(new Date()),
          });
          t.update(messageRef, {
            totalVotes: messageData.totalVotes + 1,
          });
        }
      }
    });
  };

  return (
    <div className="App">
      <p>
        <strong>Total User Vote Changes: </strong>
        {voteChanges}
      </p>
      <h1>Messages</h1>
      <ul>
        {Object.keys(votes).map((mId) => {
          const message = votes[mId];
          if (message.voter && message.message) {
            return (
              <li key={mId}>
                <p>
                  From <strong>{message.sender}</strong>, at{" "}
                  {message.dateTime.toDate().toLocaleString()}
                </p>
                <p>{message.message}</p>
                <div>
                  <button
                    style={{
                      backgroundColor: message.userVote ? "green" : "#eeeeee",
                    }}
                    onClick={upVote(mId)}
                  >
                    <span role="img" aria-label="UpVote">
                      �
                    </span>{" "}
                    {message.totalVotes}
                  </button>
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
}
