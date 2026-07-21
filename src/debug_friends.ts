
import { getFriendsForProfile } from './App'; // This won't work easily

// I need to mock the logic.
const mockFriendRequests = [
  { fromUserId: 'joao', toUserId: 'paulo', status: 'accepted' }
];

const getFriendsForProfile = (uid: string) => {
    const friendsSet = new Set<string>();
    mockFriendRequests.forEach(req => {
      if (req.status === 'accepted') {
        if (req.fromUserId === uid) friendsSet.add(req.toUserId);
        if (req.toUserId === uid) friendsSet.add(req.fromUserId);
      }
    });
    return Array.from(friendsSet);
}

console.log("Joao's friends:", getFriendsForProfile('joao'));
console.log("Paulo's friends:", getFriendsForProfile('paulo'));
