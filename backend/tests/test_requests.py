import pytest
from httpx import AsyncClient


class TestEldersCRUD:
    @pytest.mark.asyncio
    async def test_create_elder_success(
        self, client: AsyncClient, test_user_data, test_elder_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 201
        data = response.json()
        assert data['full_name'] == test_elder_data['full_name']
        assert data['address'] == test_elder_data['address']
        assert 'id' in data

    @pytest.mark.asyncio
    async def test_create_elder_as_volunteer_fails(
        self, client: AsyncClient, test_volunteer_data, test_elder_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/volunteer', json=test_volunteer_data
        )
        access_token = register_response.json()['access_token']

        response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_my_elders(
        self, client: AsyncClient, test_user_data, test_elder_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        response = await client.get(
            '/api/v1/elders/me', headers={'Authorization': f'Bearer {access_token}'}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]['full_name'] == test_elder_data['full_name']

    @pytest.mark.asyncio
    async def test_get_elder_by_id(
        self, client: AsyncClient, test_user_data, test_elder_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        create_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = create_response.json()['id']

        response = await client.get(
            f'/api/v1/elders/{elder_id}',
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 200
        data = response.json()
        assert data['id'] == elder_id
        assert data['full_name'] == test_elder_data['full_name']

    @pytest.mark.asyncio
    async def test_get_elder_forbidden_for_other_relative(
        self, client: AsyncClient, test_user_data, test_elder_data
    ):
        register_response1 = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token1 = register_response1.json()['access_token']

        create_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token1}'},
        )
        elder_id = create_response.json()['id']

        other_user_data = test_user_data.copy()
        other_user_data['login'] = 'otheruser'
        other_user_data['email'] = 'other@example.com'
        other_user_data['phone_number'] = '+79991234569'

        register_response2 = await client.post(
            '/api/v1/users/register/relative', json=other_user_data
        )
        access_token2 = register_response2.json()['access_token']

        response = await client.get(
            f'/api/v1/elders/{elder_id}',
            headers={'Authorization': f'Bearer {access_token2}'},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_elder(
        self, client: AsyncClient, test_user_data, test_elder_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        create_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = create_response.json()['id']

        update_data = {'full_name': 'Updated Elder Name', 'hobbies': 'Painting'}
        response = await client.patch(
            f'/api/v1/elders/{elder_id}',
            json=update_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 200
        data = response.json()
        assert data['full_name'] == 'Updated Elder Name'
        assert data['hobbies'] == 'Painting'

    @pytest.mark.asyncio
    async def test_delete_elder(
        self, client: AsyncClient, test_user_data, test_elder_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        create_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = create_response.json()['id']

        response = await client.delete(
            f'/api/v1/elders/{elder_id}',
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 204

        get_response = await client.get(
            f'/api/v1/elders/{elder_id}',
            headers={'Authorization': f'Bearer {access_token}'},
        )
        assert get_response.status_code == 404


class TestRequestsCRUD:
    @pytest.mark.asyncio
    async def test_create_request_success(
        self, client: AsyncClient, test_user_data, test_elder_data, test_request_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        elder_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = elder_response.json()['id']

        request_data = test_request_data.copy()
        request_data['elder_id'] = elder_id

        response = await client.post(
            '/api/v1/requests',
            json=request_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 201
        data = response.json()
        assert 'request_id' in data

    @pytest.mark.asyncio
    async def test_create_request_for_other_elder_fails(
        self, client: AsyncClient, test_user_data, test_elder_data, test_request_data
    ):
        register_response1 = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token1 = register_response1.json()['access_token']

        elder_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token1}'},
        )
        elder_id = elder_response.json()['id']

        other_user_data = test_user_data.copy()
        other_user_data['login'] = 'otheruser'
        other_user_data['email'] = 'other@example.com'
        other_user_data['phone_number'] = '+79991234569'

        register_response2 = await client.post(
            '/api/v1/users/register/relative', json=other_user_data
        )
        access_token2 = register_response2.json()['access_token']

        request_data = test_request_data.copy()
        request_data['elder_id'] = elder_id

        response = await client.post(
            '/api/v1/requests',
            json=request_data,
            headers={'Authorization': f'Bearer {access_token2}'},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_my_requests(
        self, client: AsyncClient, test_user_data, test_elder_data, test_request_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        elder_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = elder_response.json()['id']

        request_data = test_request_data.copy()
        request_data['elder_id'] = elder_id

        await client.post(
            '/api/v1/requests',
            json=request_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        response = await client.get(
            '/api/v1/requests/me', headers={'Authorization': f'Bearer {access_token}'}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_get_available_requests(
        self,
        client: AsyncClient,
        test_user_data,
        test_volunteer_data,
        test_elder_data,
        test_request_data,
    ):
        register_response1 = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token1 = register_response1.json()['access_token']

        elder_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token1}'},
        )
        elder_id = elder_response.json()['id']

        request_data = test_request_data.copy()
        request_data['elder_id'] = elder_id

        await client.post(
            '/api/v1/requests',
            json=request_data,
            headers={'Authorization': f'Bearer {access_token1}'},
        )

        register_response2 = await client.post(
            '/api/v1/users/register/volunteer', json=test_volunteer_data
        )
        access_token2 = register_response2.json()['access_token']

        response = await client.get(
            '/api/v1/requests/available',
            headers={'Authorization': f'Bearer {access_token2}'},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_update_request(
        self, client: AsyncClient, test_user_data, test_elder_data, test_request_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        elder_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = elder_response.json()['id']

        request_data = test_request_data.copy()
        request_data['elder_id'] = elder_id

        create_response = await client.post(
            '/api/v1/requests',
            json=request_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        request_id = create_response.json()['request_id']

        update_data = {'description': 'Updated description'}
        response = await client.patch(
            f'/api/v1/requests/{request_id}',
            json=update_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 200
        data = response.json()
        assert data['description'] == 'Updated description'

    @pytest.mark.asyncio
    async def test_delete_request(
        self, client: AsyncClient, test_user_data, test_elder_data, test_request_data
    ):
        register_response = await client.post(
            '/api/v1/users/register/relative', json=test_user_data
        )
        access_token = register_response.json()['access_token']

        elder_response = await client.post(
            '/api/v1/elders',
            json=test_elder_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        elder_id = elder_response.json()['id']

        request_data = test_request_data.copy()
        request_data['elder_id'] = elder_id

        create_response = await client.post(
            '/api/v1/requests',
            json=request_data,
            headers={'Authorization': f'Bearer {access_token}'},
        )
        request_id = create_response.json()['request_id']

        response = await client.delete(
            f'/api/v1/requests/{request_id}',
            headers={'Authorization': f'Bearer {access_token}'},
        )

        assert response.status_code == 204