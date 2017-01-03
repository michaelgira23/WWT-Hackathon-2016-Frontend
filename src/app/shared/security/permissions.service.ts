import { Injectable } from '@angular/core';
import { AngularFire, FirebaseAuthState, FirebaseObjectObservable } from 'angularfire2';
import { Observable, Subject } from 'rxjs/Rx';

import { AuthService } from './auth.service';

declare global {
	interface Array<T> {
		includes(searchElement: T): boolean;
	}
}

@Injectable()
export class PermissionsService {

	authInfo: FirebaseAuthState;

	constructor(private af: AngularFire, private authService: AuthService) {
		this.authService.auth$.subscribe(
			data => {
				this.authInfo = data;
			},
			err => {
				console.log(`Error getting auth state: ${err}`);
			}
		);
	}

	createPermission($key: string, type: PermissionsType, permission: PermissionParameter): Observable<any> {
		let newPerm: Permission = {};
		let scopeTypesMatch = true;
		const typeToClass: Object = {
			'chat': PermissionsChatScopes,
			'session': PermissionsSessionScopes,
			'whiteboard': PermissionsWhiteboardScopes
		};

		for (let group of Object.keys(permission)) {
			if (group === 'user') {
				for (let $uid of Object.keys(permission.user)) {
					if (permission.user[$uid] instanceof typeToClass[type]) {
						newPerm.user[$uid] = permission.user[$uid].scopes;
					} else {
						scopeTypesMatch = false;
					}
				}
			} else {
				if (permission[group] instanceof typeToClass[type]) {
					newPerm[group] = permission[group].scopes;
				} else {
					scopeTypesMatch = false;
				}
			}
		}

		const permissions = this.af.database.object(`${type}Permissions/${$key}`);

		if (scopeTypesMatch) {
			return this.promiseToObservable(permissions.set(newPerm));
		} else {
			return Observable.throw(`\`PermissionScope\` objects provided are not of type ${type}.`);
		}
	}

	getPermission($key: string, type: PermissionsType): FirebaseObjectObservable<any> {
		return this.af.database.object(`${type}Permissions/${$key}`);
	}

	getUserPermission($key: string, type: PermissionsType): Observable<any> {
		return this.getPermission($key, type)
			.map(data => {

				// Check if there are any permissions defined for this object or if auth state is still being queried
				if (typeof data !== 'object' || typeof this.authInfo === 'undefined') {
					return {};
				}

				// If user isn't logged in, return anonymous permissions
				if (this.authInfo === null) {
					return data.anonymous ? data.anonymous : {};
				}

				// Check if custom user permissions
				if (data.user && data.user[this.authInfo.uid]) {
					return data.user[this.authInfo.uid];
				} else if (data.loggedIn) {
					// Fallback to generic logged in
					return data.loggedIn;
				}

				return {};
			});
	}

	// We have to ask for the $key and type again since that's how we organize permissions.
	addScope(
		$key: string,
		type: PermissionsType,
		scopes: PermissionsScopes, // This gets all the different scope classes.
		group: PermissionsGroup,
		$uid?: string
	): Observable<any> {
		const permission = this.af.database.object(`${type}Permissions/${$key}`);
		const subject = new Subject<any>();

		permission.subscribe(permObj => {
			if (permObj.$exists()) {
				if (group === 'user') {
					const users = this.af.database.object(`${type}Permissions/${$key}/user`);
					const scopeObj = {};
					scopeObj[$uid] = scopes;

					subject.next(this.promiseToObservable(users.update(scopeObj)));
					subject.complete();
				} else {
					const permissions = this.af.database.object(`${type}Permissions/${$key}`);
					const scopeObj = {};
					scopeObj[group] = scopes;

					subject.next(this.promiseToObservable(permissions.update(scopeObj)));
					subject.complete();
				}
			} else {
				let newPerm: PermissionParameter = {};

				if (group === 'user') {
					newPerm['user'][$uid] = scopes;
				} else {
					newPerm[group] = scopes;
				}

				this.createPermission($key, type, newPerm).subscribe(
					data => {
						subject.next(data);
					},
					err => {
						subject.error(err);
						subject.complete();
					}
				);
			}
		});

		return subject.asObservable();
	}

	// See line 29
	removeScope(
		$key: string,
		type: PermissionsType,
		_scopeObj: PermissionsScopes, // This gets all the different scope classes.
		group: PermissionsGroup,
		$uid?: string
	) {
		const scopes = _scopeObj.scopes;

		const permission = this.af.database.object(`${type}Permissions/${$key}`);
		const subject = new Subject<any>();

		permission.subscribe(permObj => {
			if (permObj.$exists()) {
				if (group === 'user') {
					const userPermissions = this.af.database.object(`${type}Permissions/${$key}/user/${$uid}`);
					const scopeObj = {};
					for (let scope of Object.keys(scopes)) {
						scopeObj[scope] = null;
					}

					subject.next(this.promiseToObservable(userPermissions.update(scopeObj)));
					subject.complete();
				} else {
					const groupPermissions = this.af.database.object(`${type}Permissions/${$key}/${group}`);
					const scopeObj = {};
					for (let scope of Object.keys(scopes)) {
						scopeObj[scope] = null;
					}

					subject.next(this.promiseToObservable(groupPermissions.update(scopeObj)));
					subject.complete();
				}
			}
		});

		return subject.asObservable();
	}

	private promiseToObservable(promise): Observable<any> {

		const subject = new Subject<any>();

		promise
			.then(res => {
					subject.next(res);
					subject.complete();
				},
				err => {
					subject.error(err);
					subject.complete();
				});

		return subject.asObservable();
	}

}


// We use classes here instead of interfaces since we can check them on runtime.
class PermissionsScopes {

	scopes: Object = {};

	constructor(newScopes: Object) {
		for (let scope of Object.keys(newScopes)) {
			// Remove every scope that is false.
			if (!newScopes[scope]) {
				delete newScopes[scope];
			}

			// Remove every scope that is not in the component scopes.
			if (!(<any>this.constructor).componentScopes.includes(scope)) {
				delete newScopes[scope];
			}
		}

		this.scopes = newScopes;
	}
}

export class PermissionsChatScopes extends PermissionsScopes {
	static componentScopes = ['read', 'write', 'moderator'];

	constructor(newScopes: Object) { super(newScopes); }
}

export class PermissionsSessionScopes extends PermissionsScopes {
	static componentScopes = ['read', 'write', 'moderator'];

	constructor(newScopes: Object) { super(newScopes); }
}

export class PermissionsWhiteboardScopes extends PermissionsScopes {
	static componentScopes = ['read', 'write', 'moderator'];

	constructor(newScopes: Object) { super(newScopes); }
}

export type PermissionsType = 'chat' | 'session' | 'whiteboard';

export type PermissionsGroup = 'anonymous' | 'loggedIn' | 'user';

export interface Permission {
	// We can't use [T in PermissionsGroup] here since 'user' is a special case with the extra $uid.
	anonymous?: Object;
	loggedIn?: Object;
	user?: {
		[$uid: string]: Object;
	};
}

export interface PermissionParameter {
	anonymous?: PermissionsScopes;
	loggedIn?: PermissionsScopes;
	user?: {
		[$uid: string]: PermissionsScopes;
	};
}
