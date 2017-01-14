import { Injectable } from '@angular/core';
import {
	CanActivateChild, Router,
	ActivatedRouteSnapshot,
	RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs/Rx';
import { SessionService } from './session.service';

@Injectable()
export class SessionGuardService implements CanActivateChild {

	constructor(private router: Router, private sessions: SessionService) { }

	canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
		let sessionId = route.params['id'] ? route.params['id'] : route.parent.params['id'];
		return this.sessions.findSession(sessionId).take(1)
			.map(session => {
				return session.tutees.some(user => this.sessions.uid === user.$key) || session.tutor.$key === this.sessions.uid;
			});
	}
}