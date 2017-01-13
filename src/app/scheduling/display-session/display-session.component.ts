import { Component, OnInit, Input} from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '../../shared/model/session';
import { SessionService } from '../../shared/model/session.service';
import { UUID } from 'angular2-uuid';

@Component({
	selector: 'app-display-session',
	templateUrl: './display-session.component.html',
	styleUrls: ['./display-session.component.scss']
})
export class DisplaySessionComponent implements OnInit {

	menuId: string = UUID.UUID();

	@Input()
	session: Session;
	get startTime(): string {
		return this.session.start.format('ddd, M/D/Y h:mm:ss');
	};
	get endTime(): string {
		return this.session.end.format('h:mm:ss');
	}
	get subject(): string {
		return this.session.subject.toLowerCase();
	}

	sideOpen: boolean;

	get joinable() {
		return this.session.tutees.some(user => this.sessionService.uid === user.$key);
	}

	get pending() {
		return this.session.pending.some(uid => this.sessionService.uid === uid);
	}

	constructor(private router: Router, private sessionService: SessionService) {
	}

	ngOnInit() {
	}

	joinSession() {
		this.router.navigate(['session', this.session.$key]);
	}

	updateSession() {
		this.router.navigate(['scheduling', 'update', this.session.$key]);
	}

	deleteSession() {
		this.sessionService.deleteSession(this.session.$key).subscribe(
			val => console.log('deleted'),
			err => console.log(err)
		);
	}

	enrollSession() {
		this.sessionService.addTutees(this.session.$key, this.sessionService.uid).subscribe(val => {
			console.log('added Tutees')
		}, console.log);
	}

	checkPending() {
		this.router.navigate(['session', this.session.$key, 'requests']);
	}
}
