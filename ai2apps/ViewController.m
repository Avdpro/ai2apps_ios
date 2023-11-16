//
//  ViewController.m
//  ai2apps
//
//  Created by Avdpro Pang on 2023/11/17.
//

#import "ViewController.h"
#import "WebVIewUtil.h"
@interface ViewController (){
	WebViewUtil *_webViewUtil;
}
@end

@implementation ViewController

- (void)viewDidLoad {
	[super viewDidLoad];
	// Do any additional setup after loading the view.
    [self performSelector:@selector(start) withObject:nil afterDelay:1/20.0f];
}

- (void)dealloc {
    //[_webViewUtil release];
    [super dealloc];
}

- (void)start {
	int topgap,bottomgap;
	topgap =0; //self.view.safeAreaInsets.top;
	bottomgap =0;// self.view.safeAreaInsets.bottom;
    CGRect rect=self.view.frame;
    rect.origin.y+=topgap;
    rect.size.height-=topgap;
    _webViewUtil = [[WebViewUtil alloc]initWithFrame:rect code:@"app" domain:@"www.ai2apps.com" index:@"start.html" params:@{}];
    _webViewUtil.webView.center = self.view.center;
    [self.view addSubview:_webViewUtil.webView];

    [_webViewUtil loadIndex];
}

@end
