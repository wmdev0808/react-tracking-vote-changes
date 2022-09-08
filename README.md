# Requirements

There are `n` items the user can vote on.
There are two React states:

- `votes` is an array of the user's votes on every item.

  ```
  const [votes, setVotes] = useState({});
  ```

- `voteChanges` indicates how many times the user changed their votes on any of the items.
  ```
  const [voteChanges, setVoteChanges] = useState(0);
  ```

We have a database listener defined in a `useEffect`. When votes are added/changed in the database, the listener gets called. We need the state `votes` to compare every new vote with its previous value in `votes` to decide whether to increment `voteChanges`. However, we cannot define `votes` as a dependency in `useEffect`, otherwise we will end up in an infinite loop. To get access to the current value of `votes`, we use its functional update. Is it okay to call `setVoteChanges` inside the functional update of `setVotes`? If no, why, and how would you solve this problem?

```
useEffect(() => {
  databaseListener((changes) => {
    setVotes((oldVotes) => {
      const oVotes = { ...oldVotes };
      for (let change of changes) {
        const itemId = change.id;
        const newVote = change.vote;
        if (oVotes[itemId] !== newVote) {
          setVoteChanges(oldCount => oldCount + 1);
        }
        oVotes[itemId] = newVote;
      }
      return oVotes;
    });
  });
});
```

# Answer

From the performance perspective, it's not OK.

## Why?

Doing so introduce additional re-render even though your current code works as expected.

## Solution

`voteChanges` totally depends on `votes` update and is also synced to `votes` changes.
That's why we can just extract it and save it inside `ref`, resulting in avoiding unnecessary re-render.

[Codesandbox Solution](https://codesandbox.io/s/react-tracking-vote-changes-forked-d18nw0?file=/src/README.md:1404-1761)
