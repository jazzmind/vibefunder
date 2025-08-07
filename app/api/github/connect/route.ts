import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import GitHubService from "@/lib/services/GitHubService";

const GitHubConnectSchema = z.object({
  githubToken: z.string().min(1, "GitHub token is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { githubToken } = GitHubConnectSchema.parse(body);

    // Test the GitHub token
    const githubService = new GitHubService(githubToken);
    const isValid = await githubService.testConnection();
    
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Invalid GitHub token or insufficient permissions' 
      }, { status: 400 });
    }

    // Get GitHub username
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let username = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      username = userData.login;
    }

    // Store or update GitHub connection
    const connection = await prisma.gitHubConnection.upsert({
      where: { userId: session.user.id },
      update: {
        githubToken: githubToken, // In production, this should be encrypted
        username,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        githubToken: githubToken, // In production, this should be encrypted
        username,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      username,
      connectionId: connection.id
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: error.errors 
      }, { status: 400 });
    }

    console.error('Error connecting GitHub account:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        username: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      connected: !!connection,
      connection: connection || null
    });

  } catch (error) {
    console.error('Error fetching GitHub connection:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.gitHubConnection.delete({
      where: { userId: session.user.id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error disconnecting GitHub account:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}