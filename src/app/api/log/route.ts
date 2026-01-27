import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'valve-log.txt');

export async function POST(request: NextRequest) {
  try {
    const { timestamp, component, action, state } = await request.json();

    const logLine = `[${timestamp}] ${component}: ${action}${state ? ` (${state})` : ''}\n`;

    await fs.appendFile(LOG_FILE, logLine, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write log:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await fs.writeFile(LOG_FILE, '', 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
