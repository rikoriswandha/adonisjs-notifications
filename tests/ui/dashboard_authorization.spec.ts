import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import {
  authorizeDashboardRequest,
  shouldRegisterDashboardRoutes,
  type DashboardAuthorizationResource,
} from '../../src/ui/dashboard/authorization.ts'

function createContext() {
  const state = { status: 200, body: undefined as unknown }
  const ctx = {
    response: {
      forbidden(body: unknown) {
        state.status = 403
        state.body = body
      },
    },
  } as unknown as HttpContext

  return { ctx, state }
}

test.group('Dashboard authorization', () => {
  test('does not register production routes without an authorizer', ({ assert }) => {
    assert.isFalse(shouldRegisterDashboardRoutes(true, {}))
  })

  test('registers production routes when an authorizer is supplied', ({ assert }) => {
    assert.isTrue(shouldRegisterDashboardRoutes(true, { authorize: () => true }))
  })

  test('keeps development routes available without an authorizer', ({ assert }) => {
    assert.isTrue(shouldRegisterDashboardRoutes(false, {}))
  })

  test('returns 403 when authorization is denied', async ({ assert }) => {
    const { ctx, state } = createContext()

    const allowed = await authorizeDashboardRequest(
      ctx,
      { action: 'deleteNotification', notificationId: 'notification-1' },
      () => false
    )

    assert.isFalse(allowed)
    assert.equal(state.status, 403)
    assert.deepEqual(state.body, { error: 'Forbidden' })
  })

  test('passes object identifiers to the authorizer', async ({ assert }) => {
    const { ctx } = createContext()
    let received: DashboardAuthorizationResource | undefined

    const allowed = await authorizeDashboardRequest(
      ctx,
      { action: 'viewInbox', notifiableType: 'User', notifiableId: '42' },
      (_ctx, resource) => {
        received = resource
        return true
      }
    )

    assert.isTrue(allowed)
    assert.deepEqual(received, {
      action: 'viewInbox',
      notifiableType: 'User',
      notifiableId: '42',
    })
  })
})
