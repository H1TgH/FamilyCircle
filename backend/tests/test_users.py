import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestUserRegistration:
    @pytest.mark.asyncio
    async def test_register_relative_success(self, client: AsyncClient, test_user_data):
        response = await client.post('/api/v1/users/register/relative', json=test_user_data)

        assert response.status_code == 201
        data = response.json()
        assert 'access_token' in data
        assert 'refresh_token' in data

    @pytest.mark.asyncio
    async def test_register_volunteer_success(
        self, client: AsyncClient, test_volunteer_data
    ):
        response = await client.post(
            '/api/v1/users/register/volunteer', json=test_volunteer_data
        )

        assert response.status_code == 201
        data = response.json()
        assert 'access_token' in data
        assert 'refresh_token' in data

    @pytest.mark.asyncio
    async def test_register_duplicate_login(self, client: AsyncClient, test_user_data):
        await client.post('/api/v1/users/register/relative', json=test_user_data)

        duplicate_data = test_user_data.copy()
        duplicate_data['email'] = 'different@example.com'
        duplicate_data['phone_number'] = '+79991234569'

        response = await client.post('/api/v1/users/register/relative', json=duplicate_data)

        assert response.status_code == 400
        assert 'login already exists' in response.json()['detail'].lower()

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user_data):
        await client.post('/api/v1/users/register/relative', json=test_user_data)

        duplicate_data = test_user_data.copy()
        duplicate_data['login'] = 'differentuser'
        duplicate_data['phone_number'] = '+79991234569'

        response = await client.post('/api/v1/users/register/relative', json=duplicate_data)

        assert response.status_code == 400
        assert 'email already exists' in response.json()['detail'].lower()

    @pytest.mark.asyncio
    async def test_register_duplicate_phone(self, client: AsyncClient, test_user_data):
        await client.post('/api/v1/users/register/relative', json=test_user_data)

        duplicate_data = test_user_data.copy()
        duplicate_data['login'] = 'differentuser'
        duplicate_data['email'] = 'different@example.com'

        response = await client.post('/api/v1/users/register/relative', json=duplicate_data)

        assert response.status_code == 400
        assert 'phone number already exists' in response.json()['detail'].lower()


class TestUserLogin:
    @pytest.mark.asyncio
    async def test_login_with_username_success(self, client: AsyncClient, test_user_data):
        await client.post('/api/v1/users/register/relative', json=test_user_data)

        login_data = {
            'login_or_email': test_user_data['login'],
            'password': test_user_data['password'],
        }
        response = await client.post('/api/v1/users/login', json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert 'refresh_token' in data

    @pytest.mark.asyncio
    async def test_login_with_email_success(self, client: AsyncClient, test_user_data):
        await client.post('/api/v1/users/register/relative', json=test_user_data)

        login_data = {
            'login_or_email': test_user_data['email'],
            'password': test_user_data['password'],
        }
        response = await client.post('/api/v1/users/login', json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert 'refresh_token' in data

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user_data):
        await client.post('/api/v1/users/register/relative', json=test_user_data)

        login_data = {
            'login_or_email': test_user_data['login'],
            'password': 'WrongPassword123!',
        }
        response = await client.post('/api/v1/users/login', json=login_data)

        assert response.status_code == 401
        assert 'incorrect' in response.json()['detail'].lower()

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        login_data = {'login_or_email': 'nonexistent', 'password': 'Password123!'}
        response = await client.post('/api/v1/users/login', json=login_data)

        assert response.status_code == 401
        assert 'incorrect' in response.json()['detail'].lower()


class TestTokenRefresh:
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient, test_user_data):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        refresh_token = register_response.json()['refresh_token']

        response = await client.post(
            '/api/v1/users/refresh-token', json={'refresh_token': refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert len(data['refresh_token']) > 0
        assert len(data['access_token']) > 0

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(self, client: AsyncClient):
        response = await client.post(
            '/api/v1/users/refresh-token', json={'refresh_token': 'invalid_token'}
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_already_used(
        self, client: AsyncClient, test_user_data, db_session: AsyncSession
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        refresh_token = register_response.json()['refresh_token']

        await client.post('/api/v1/users/refresh-token', json={'refresh_token': refresh_token})

        response = await client.post(
            '/api/v1/users/refresh-token', json={'refresh_token': refresh_token}
        )

        assert response.status_code == 401


class TestLogout:
    @pytest.mark.asyncio
    async def test_logout_success(self, client: AsyncClient, test_user_data):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        refresh_token = register_response.json()['refresh_token']

        response = await client.post(
            '/api/v1/users/logout', json={'refresh_token': refresh_token}
        )

        assert response.status_code == 204

        refresh_response = await client.post(
            '/api/v1/users/refresh-token', json={'refresh_token': refresh_token}
        )
        assert refresh_response.status_code == 401


class TestUserProfile:
    @pytest.mark.asyncio
    async def test_get_me_success(self, client: AsyncClient, test_user_data):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        response = await client.get(
            '/api/v1/users/me', headers={'Authorization': f'Bearer {access_token}'}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['login'] == test_user_data['login']
        assert data['email'] == test_user_data['email']
        assert data['surname'] == test_user_data['surname']
        assert data['name'] == test_user_data['name']
        assert 'password' not in data

    @pytest.mark.asyncio
    async def test_get_me_unauthorized(self, client: AsyncClient):
        response = await client.get('/api/v1/users/me')

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_user_by_id(self, client: AsyncClient, test_user_data):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        me_response = await client.get(
            '/api/v1/users/me', headers={'Authorization': f'Bearer {access_token}'}
        )
        user_id = me_response.json()['id']

        response = await client.get(f'/api/v1/users/{user_id}')

        assert response.status_code == 200
        data = response.json()
        assert data['id'] == user_id
        assert data['login'] == test_user_data['login']

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, client: AsyncClient):
        from uuid import uuid4

        fake_id = str(uuid4())
        response = await client.get(f'/api/v1/users/{fake_id}')

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_profile(self, client: AsyncClient, test_user_data):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        update_data = {'name': 'Updated', 'surname': 'User'}
        response = await client.patch(
            '/api/v1/users/me',
            data=update_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 200
        data = response.json()
        assert data['name'] == 'Updated'
        assert data['surname'] == 'User'