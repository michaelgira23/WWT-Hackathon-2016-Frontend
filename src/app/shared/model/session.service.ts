import { Injectable, Inject } from '@angular/core';
import { Observable, Subject } from 'rxjs/Rx';
import { AngularFireDatabase, FirebaseRef } from 'angularfire2';
import { Session } from './session';
import { User } from './user';
import { AuthService } from '../security/auth.service';
import { WhiteboardService, WhiteboardOptions } from './whiteboard.service';
import * as moment from 'moment';

@Injectable()
export class SessionService {
	sdkDb: any;
	uid: string;

	constructor(private db: AngularFireDatabase, @Inject(FirebaseRef) fb, private authService: AuthService, private whiteboardService: WhiteboardService) {
		this.sdkDb = fb.database().ref();
		this.authService.auth$.subscribe(val => {
			if (val) this.uid = val.uid;
			console.log('get uid: ' +  this.uid);
		});
	}

	firebaseUpdate(dataToSave) {
		const subject = new Subject();

		this.sdkDb.update(dataToSave)
			.then(
				val => {
					subject.next(val);
					subject.complete();
				},
				err => {
					subject.error(err);
					subject.complete();
				}
			);

		return subject.asObservable();
	}

	combineWithUser(sessionQuery: Observable<any>): Observable<Session> {
		let sessionWithUser;
		return sessionQuery.switchMap(val => {
			sessionWithUser = val;
			return this.db.object('users/' + val.tutor)
		}).map(val => {
			sessionWithUser.tutor = val;
			return sessionWithUser;
		});
	}

	combineArrWithUser(sessionQuery: Observable<any[]>): Observable<Session[]> {
		let sessionWithUser;
		return sessionQuery.switchMap((val: any[]) => {
			sessionWithUser = val;
			return Observable.combineLatest(
				val.map((session) => this.db.object('users/' + session.tutor))
			);
		}).map((val: any[]) => {
			sessionWithUser.map((session, index) => session.tutor = val[index]);
			return sessionWithUser;
		});
	}

	findSession(id: string, query?: {}): Observable<Session> {
		return this.combineWithUser(
			this.db.object('/sessions/' + id)
			.flatMap(val => val.$exists() ? Observable.of(val) : Observable.throw(`Session ${val.$key} does not exist`)));
	}

	findMySessions(): {tutorSessions: Observable<Session[]>, tuteeSessions: Observable<Session[]>} {
		if (!this.uid) return {tutorSessions: Observable.throw('Rip no login info'), tuteeSessions: Observable.throw('Rip no login info')};
		return {
			tutorSessions: this.db.list(`/users/${this.uid}/tutorSessions`)
				.map(sessions => sessions.map(session => this.findSession(session.$key)))
				.flatMap(sessions$arr => Observable.combineLatest(sessions$arr))
				.map(Session.fromJsonArray),
			tuteeSessions: this.db.list(`/users/${this.uid}/tuteeSessions`)
				.map(sessions => sessions.map(session => this.findSession(session.$key)))
				.flatMap(sessions$arr => Observable.combineLatest(sessions$arr))
				.map(Session.fromJsonArray)
		}
	}

	findPublicSessions(): Observable<Session[]> {
		return this.combineArrWithUser(
			this.db.list('sessions', {
				query: {
					orderByChild: 'listed',
					equalTo: true
				}
			})
		);
	}

	findSessionsByTags(tags: string[]): Observable<Session[]> {
		return Observable.of(tags)
			.map(tags => tags.map(tag => this.db.list('sessionsByTags/' + tag)))
			.flatMap(tags$arr => Observable.combineLatest(tags$arr))
			.map(sessionsByTag => {sessionsByTag = sessionsByTag.reduce((a, b) => a.concat(b));
				return sessionsByTag.map(session => this.findSession(session.$key).do(console.log))})
			.flatMap(session$arr => Observable.combineLatest(session$arr))
			.map(Session.fromJsonArray);
	}

	updateSession(sessionId: string, session: SessionOptions): Observable<any> {
		if (!this.uid) return Observable.throw('Rip no login info');
		let sessionToSave = Object.assign({}, session);
		const uidsToSave = {};
		session.tutees.forEach(uid => uidsToSave[uid] = false);
		sessionToSave.tutor = this.uid;

		let dataToSave = {};
		dataToSave['sessions/' + sessionId] = sessionToSave;
		dataToSave['usersInSession/' + sessionId] = uidsToSave;
		dataToSave[`users/${this.uid}/tutorSessions/${sessionId}`] = true;
		session.tutees.forEach(uid => dataToSave[`users/${uid}/tuteeSessions/${sessionId}`] = true);
		session.tags.forEach(tag => dataToSave[`sessionsByTags/${tag}/${sessionId}`] = true);

		return this.firebaseUpdate(dataToSave);
	}

	createSession(session: SessionOptions, wbOpt?: WhiteboardOptions): Observable<any> {
		const wbOptDefault = {
			background: '#FFF'
		}
		return this.whiteboardService.createWhiteboard(wbOpt.background.match('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$') ? wbOpt : wbOptDefault)
		.switchMap(wb => {
			const newSessionKey = this.sdkDb.child('sessions').push().key;
			session.whiteboard = wb.key;
			session.canceled = false;
			return this.updateSession(newSessionKey, session);
		})
	}

	createAnonSession(): Observable<any> {
		return Observable.from(undefined);
	}

	deleteSession(sessionId: string): Observable<any> {
		// calling update null on a location in the database will cause it to be deleted. 
		let dataToDelete = {};

		dataToDelete['sessions/' + sessionId] = null;
		return this.firebaseUpdate(dataToDelete);
	}

	joinSession(sessionId: String): Observable<any> {
		if (!this.uid) return Observable.throw('Rip no login info');

		this.sdkDb.child(`/usersInSession/${sessionId}/${this.uid}`).onDisconnect().set(false);

		let dataToSave = {};
		dataToSave[`/usersInSession/${sessionId}/${this.uid}`] = true;
		return this.firebaseUpdate(dataToSave);
	}

	getOnlineUsers(sessionId): Observable<User[]> {
		return this.db.list('usersInSession/' + sessionId)
		.map(uids => uids.map(uid => this.db.object('users/' + uid.$key)))
		.flatMap(uid$arr => Observable.combineLatest(uid$arr))
		.map(User.fromJsonList);
	}
}

export interface SessionOptions {
	start: string,
	end: string,
	tutor: string,
	max: number,
	listed: boolean,
	title: string,
	desc: string,
	tutees: string[],
	tags: string[],
	whiteboard: string,
	canceled: boolean
}