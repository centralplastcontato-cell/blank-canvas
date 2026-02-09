import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ManageUserRequest {
  action: 'create' | 'update' | 'toggle_active' | 'delete' | 'reset_password' | 'update_permission'
  email?: string
  password?: string
  full_name?: string
  role?: 'admin' | 'comercial' | 'visualizacao'
  user_id?: string
  is_active?: boolean
  new_password?: string
  // Permission-specific fields
  permission_code?: string
  granted?: boolean
  // Company linking
  company_id?: string
  company_role?: string // 'owner' | 'admin' | 'member'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create regular client to verify the requester
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify the requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !requestingUser) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      console.error('Role check failed:', roleError, roleData)
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ManageUserRequest = await req.json()
    console.log('Request body:', body)

    if (body.action === 'create') {
      // Create new user
      if (!body.email || !body.password || !body.full_name || !body.role) {
        return new Response(
          JSON.stringify({ error: 'Email, senha, nome e perfil são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user in auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true, // Auto-confirm email
      })

      if (createError) {
        console.error('Create user error:', createError)
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('User created:', newUser.user?.id)

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.user!.id,
          email: body.email,
          full_name: body.full_name,
          is_active: true,
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        // Rollback: delete the user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(newUser.user!.id)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar perfil: ' + profileError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user!.id,
          role: body.role,
        })

      if (roleInsertError) {
        console.error('Role error:', roleInsertError)
        // Rollback
        await supabaseAdmin.auth.admin.deleteUser(newUser.user!.id)
        return new Response(
          JSON.stringify({ error: 'Erro ao criar role: ' + roleInsertError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Link user to company if company_id provided
      if (body.company_id) {
        const { error: companyLinkError } = await supabaseAdmin
          .from('user_companies')
          .insert({
            user_id: newUser.user!.id,
            company_id: body.company_id,
            role: body.company_role || 'admin',
            is_default: true,
          })

        if (companyLinkError) {
          console.error('Company link error:', companyLinkError)
          // Don't fail the whole operation, just log it
        } else {
          console.log('User linked to company:', body.company_id, 'as', body.company_role || 'admin')
        }
      }

      // Grant default permissions based on role
      const defaultPermissions = getDefaultPermissionsForRole(body.role)
      if (defaultPermissions.length > 0) {
        const permissionInserts = defaultPermissions.map(perm => ({
          user_id: newUser.user!.id,
          permission: perm,
          granted: true,
          granted_by: requestingUser.id,
        }))

        const { error: permError } = await supabaseAdmin
          .from('user_permissions')
          .insert(permissionInserts)

        if (permError) {
          console.error('Permission insert error:', permError)
          // Don't fail the whole operation, just log it
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário criado com sucesso',
          user_id: newUser.user!.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'update') {
      if (!body.user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update profile if name provided
      if (body.full_name) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ full_name: body.full_name })
          .eq('user_id', body.user_id)

        if (profileError) {
          console.error('Profile update error:', profileError)
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar perfil: ' + profileError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Update role if provided
      if (body.role) {
        const { error: roleUpdateError } = await supabaseAdmin
          .from('user_roles')
          .update({ role: body.role })
          .eq('user_id', body.user_id)

        if (roleUpdateError) {
          console.error('Role update error:', roleUpdateError)
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar perfil: ' + roleUpdateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário atualizado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'toggle_active') {
      if (!body.user_id || body.is_active === undefined) {
        return new Response(
          JSON.stringify({ error: 'user_id e is_active são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: toggleError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: body.is_active })
        .eq('user_id', body.user_id)

      if (toggleError) {
        console.error('Toggle active error:', toggleError)
        return new Response(
          JSON.stringify({ error: 'Erro ao alterar status: ' + toggleError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: body.is_active ? 'Usuário ativado' : 'Usuário desativado' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'delete') {
      if (!body.user_id) {
        return new Response(
          JSON.stringify({ error: 'user_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Prevent self-deletion
      if (body.user_id === requestingUser.id) {
        return new Response(
          JSON.stringify({ error: 'Você não pode excluir sua própria conta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete user permissions first
      const { error: permDeleteError } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', body.user_id)

      if (permDeleteError) {
        console.error('Permissions delete error:', permDeleteError)
      }

      // Delete user role
      const { error: roleDeleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', body.user_id)

      if (roleDeleteError) {
        console.error('Role delete error:', roleDeleteError)
      }

      // Delete profile
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', body.user_id)

      if (profileDeleteError) {
        console.error('Profile delete error:', profileDeleteError)
      }

      // Delete from auth
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(body.user_id)

      if (authDeleteError) {
        console.error('Auth delete error:', authDeleteError)
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir usuário: ' + authDeleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'reset_password') {
      if (!body.user_id || !body.new_password) {
        return new Response(
          JSON.stringify({ error: 'user_id e new_password são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (body.new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
        body.user_id,
        { password: body.new_password }
      )

      if (resetError) {
        console.error('Password reset error:', resetError)
        return new Response(
          JSON.stringify({ error: 'Erro ao resetar senha: ' + resetError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Password reset successfully for user:', body.user_id)

      return new Response(
        JSON.stringify({ success: true, message: 'Senha alterada com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (body.action === 'update_permission') {
      if (!body.user_id || !body.permission_code || body.granted === undefined) {
        return new Response(
          JSON.stringify({ error: 'user_id, permission_code e granted são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if permission exists
      const { data: existingPerm } = await supabaseAdmin
        .from('user_permissions')
        .select('id')
        .eq('user_id', body.user_id)
        .eq('permission', body.permission_code)
        .maybeSingle()

      if (existingPerm) {
        // Update existing permission
        const { error: updateError } = await supabaseAdmin
          .from('user_permissions')
          .update({ 
            granted: body.granted,
            granted_by: requestingUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPerm.id)

        if (updateError) {
          console.error('Permission update error:', updateError)
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar permissão: ' + updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        // Insert new permission
        const { error: insertError } = await supabaseAdmin
          .from('user_permissions')
          .insert({
            user_id: body.user_id,
            permission: body.permission_code,
            granted: body.granted,
            granted_by: requestingUser.id,
          })

        if (insertError) {
          console.error('Permission insert error:', insertError)
          return new Response(
            JSON.stringify({ error: 'Erro ao criar permissão: ' + insertError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      console.log('Permission updated:', body.permission_code, 'for user:', body.user_id, 'granted:', body.granted)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: body.granted ? 'Permissão concedida' : 'Permissão revogada' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper function to get default permissions based on role
function getDefaultPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'admin':
      return [
        'leads.view',
        'leads.edit',
        'leads.delete',
        'leads.export',
        'leads.assign',
        'users.view',
        'users.manage',
        'permissions.manage',
      ]
    case 'comercial':
      return [
        'leads.view',
        'leads.edit',
        'leads.assign',
      ]
    case 'visualizacao':
      return [
        'leads.view',
      ]
    default:
      return []
  }
}
