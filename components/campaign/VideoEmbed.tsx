'use client';

interface VideoEmbedProps {
  url: string;
  title?: string;
  className?: string;
}

export default function VideoEmbed({ url, title, className = '' }: VideoEmbedProps) {
  // Extract video ID and platform from URL
  const getVideoEmbedUrl = (url: string) => {
    // YouTube patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    
    if (youtubeMatch) {
      return {
        embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&modestbranding=1&showinfo=0`,
        platform: 'youtube'
      };
    }
    
    // Vimeo patterns
    const vimeoRegex = /vimeo\.com\/(?:.*\/)?(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    
    if (vimeoMatch) {
      return {
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?byline=0&portrait=0`,
        platform: 'vimeo'
      };
    }
    
    return null;
  };

  const videoData = getVideoEmbedUrl(url);
  
  if (!videoData) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-600 dark:text-gray-400">
          Unsupported video URL. Please use YouTube or Vimeo links.
        </p>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          View video
        </a>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="aspect-video w-full">
        <iframe
          src={videoData.embedUrl}
          title={title || 'Campaign video'}
          className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}