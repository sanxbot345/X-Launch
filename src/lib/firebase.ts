import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const githubAuthProvider = new GithubAuthProvider();
// Request scopes for reading repositories
githubAuthProvider.addScope('repo');
githubAuthProvider.addScope('read:user');
